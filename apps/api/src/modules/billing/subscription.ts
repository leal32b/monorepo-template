import {
  type AuditAction,
  type CheckoutKind,
  type Money,
  type PlanKey,
  plans,
  prorateUpgrade,
  type SubscriptionState
} from '@repo/contracts'
import type { ProviderSubscription } from '#libs/ports/billing-provider.port'
import {
  CancellationScheduledException,
  CheckoutOpenException,
  PaymentOverdueException,
  PlanChangeNotAllowedException,
  SubscriptionNotActiveException
} from './billing.errors'

/** The provider's side of the open checkout, once it answered: its id, its page and until when it takes a payment. */
export type CheckoutPage = { id: string; url: string; expiresAt: Date }

/**
 * An organization's subscription row (ADR 0063). The plan is ours, set only by the billing use cases;
 * the payment state (`status`, the period, `pastDueSince`, `cancelAtPeriodEnd`) comes only from the
 * provider. `checkout` is claimed first, and `checkoutPage` stored once the provider opened it.
 */
export type Subscription = SubscriptionState & {
  organizationId: string
  /** Who holds the customer, and its ids there. */
  provider: string | null
  customerId: string | null
  providerSubscriptionId: string | null
  checkoutPage: CheckoutPage | null
  /** 0 while the organization has no row, on trial: the first save inserts it (ADR 0048). */
  version: number
  createdAt: Date
  updatedAt: Date
}

/** How long a claimed checkout waits for the provider's page before a new one may start (ADR 0063). */
export const CLAIM_EXPIRES_MS = 10 * 60 * 1000

/** An organization with no row: on trial until `trialEndsAt`, which the membership read derived from its creation. */
export function onTrial(organizationId: string, trialEndsAt: Date, now: Date): Subscription {
  return {
    organizationId,
    status: 'trialing',
    plan: null,
    nextPlan: null,
    trialEndsAt,
    periodStartsAt: null,
    paidThrough: null,
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: null,
    provider: null,
    customerId: null,
    providerSubscriptionId: null,
    checkoutPage: null,
    version: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Where the open checkout stands `now`: none; `opening` while a request claimed it and waits for the
 * provider; `payable` while its page takes a payment; `lapsed` once its page expired, or its claim was
 * left for 10 minutes by a process that died between the claim and the store.
 */
export function openCheckoutOf(subscription: Subscription, now: Date): 'none' | 'opening' | 'payable' | 'lapsed' {
  if (subscription.checkout === null) return 'none'
  if (subscription.checkoutPage === null) {
    return now.getTime() - subscription.updatedAt.getTime() >= CLAIM_EXPIRES_MS ? 'lapsed' : 'opening'
  }
  return now >= subscription.checkoutPage.expiresAt ? 'lapsed' : 'payable'
}

const priceOf = (plan: PlanKey) => plans[plan].price.amount

/**
 * What choosing `plan` through the checkout means (ADR 0063), with no checkout open: a subscription at
 * the plan's full price on trial, after an end, while past due (a new one replaces the overdue one) or
 * for the current plan (to change how to pay); for a dearer plan while active, an upgrade that pays the
 * difference for the days left, or nothing below the provider's minimum charge. A cheaper plan waits for
 * the end of the period, and nothing changes while the plan is set to end.
 */
export function decideCheckout(
  subscription: Subscription,
  plan: PlanKey,
  now: Date,
  minimumCharge: Money
): { kind: CheckoutKind; amount: Money } | { kind: 'free-upgrade' } {
  const current = subscription.plan
  if (subscription.status !== 'active' || current === null || current === plan) {
    return { kind: 'subscription', amount: plans[plan].price }
  }
  if (subscription.cancelAtPeriodEnd) throw new CancellationScheduledException()
  if (priceOf(plan) < priceOf(current)) throw new PlanChangeNotAllowedException('downgrade')
  const amount = prorateUpgrade({
    from: current,
    to: plan,
    periodStartsAt: subscription.periodStartsAt as Date,
    paidThrough: subscription.paidThrough as Date,
    now
  })
  return amount.amount < minimumCharge.amount ? { kind: 'free-upgrade' } : { kind: 'upgrade', amount }
}

/** Holds the one checkout of the organization for `plan` while the provider opens its page. */
export function claimCheckout(
  subscription: Subscription,
  checkout: { kind: CheckoutKind; plan: PlanKey; amount: Money },
  now: Date
): Subscription {
  return { ...subscription, checkout, checkoutPage: null, updatedAt: now }
}

/** The page the provider opened for the claimed checkout, and the customer it is for. */
export function storeCheckout(
  subscription: Subscription,
  { page, provider, customerId }: { page: CheckoutPage; provider: string; customerId: string },
  now: Date
): Subscription {
  return { ...subscription, checkoutPage: page, provider, customerId, updatedAt: now }
}

/** No checkout open any more: paid, abandoned, expired or released. */
export function clearCheckout(subscription: Subscription, now: Date): Subscription {
  return { ...subscription, checkout: null, checkoutPage: null, updatedAt: now }
}

/** `plan` from now: an upgrade paid for or free, which also clears a scheduled downgrade. */
export function changePlanNow(subscription: Subscription, plan: PlanKey, now: Date): Subscription {
  return { ...subscription, plan, nextPlan: null, updatedAt: now }
}

/** The refusals of a change that needs a plan paid for, active and not set to end. */
function assertChangeable(subscription: Subscription): void {
  if (subscription.status === 'past_due') throw new PaymentOverdueException()
  if (subscription.status !== 'active') throw new SubscriptionNotActiveException()
  if (subscription.cancelAtPeriodEnd) throw new CancellationScheduledException()
}

/**
 * What choosing `plan` through the plan means (ADR 0063): a cheaper plan from the end of the paid
 * period, or the current one again, which withdraws a scheduled downgrade. Nothing while an upgrade's
 * payment is open; a dearer plan goes through the checkout.
 */
export function decidePlan(
  subscription: Subscription,
  plan: PlanKey,
  now: Date
): 'downgrade' | 'withdraw' | 'unchanged' {
  assertChangeable(subscription)
  const state = openCheckoutOf(subscription, now)
  if (state === 'opening' || state === 'payable') throw new CheckoutOpenException()
  const current = subscription.plan as PlanKey
  if (priceOf(plan) > priceOf(current)) throw new PlanChangeNotAllowedException('upgrade')
  if (plan === current) return subscription.nextPlan === null ? 'unchanged' : 'withdraw'
  return subscription.nextPlan === plan ? 'unchanged' : 'downgrade'
}

/** The plan that starts at the end of the paid period, or none. */
export function scheduleNextPlan(subscription: Subscription, nextPlan: PlanKey | null, now: Date): Subscription {
  return { ...subscription, nextPlan, updatedAt: now }
}

/** Whether a cancellation can be scheduled: a subscription that is paid for or late, not set to end yet. */
export function canCancel(subscription: Subscription): boolean {
  if (subscription.status !== 'active' && subscription.status !== 'past_due') throw new SubscriptionNotActiveException()
  return !subscription.cancelAtPeriodEnd
}

/** Whether a scheduled end can be withdrawn: one is scheduled, and the plan is still paid for. */
export function canResume(subscription: Subscription): boolean {
  if (subscription.status !== 'active') throw new SubscriptionNotActiveException()
  return subscription.cancelAtPeriodEnd
}

/**
 * The provider's current state written into the row (ADR 0063): the status, the period, what is
 * overdue and a scheduled end. A `pending` subscription grants nothing, so it changes nothing. When a
 * new period has started, a scheduled downgrade becomes the plan; an end clears it.
 */
export function applyProviderState(subscription: Subscription, state: ProviderSubscription, now: Date): Subscription {
  if (state.status === 'pending') return subscription
  const renewed =
    subscription.paidThrough !== null && state.periodStart !== null && state.periodStart >= subscription.paidThrough
  const downgrades = subscription.nextPlan !== null && renewed && state.status !== 'cancelled'
  return {
    ...subscription,
    status: state.status,
    periodStartsAt: state.periodStart,
    paidThrough: state.paidThrough,
    pastDueSince: state.status === 'past_due' ? state.overdueSince : null,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    plan: downgrades ? subscription.nextPlan : subscription.plan,
    nextPlan: downgrades || state.status === 'cancelled' ? null : subscription.nextPlan,
    updatedAt: now
  }
}

/**
 * The provider's subscription that a first checkout opened, adopted by the row: the plan the checkout
 * was for, and the provider's state.
 */
export function activate(subscription: Subscription, state: ProviderSubscription, now: Date): Subscription {
  const plan = (subscription.checkout as NonNullable<Subscription['checkout']>).plan
  return {
    ...applyProviderState({ ...subscription, nextPlan: null }, state, now),
    plan,
    providerSubscriptionId: state.subscriptionId,
    customerId: state.customerId,
    checkout: null,
    checkoutPage: null
  }
}

/** The fields of the row an audit entry names, never their values (ADR 0061). */
const auditedFields = [
  'status',
  'plan',
  'nextPlan',
  'periodStartsAt',
  'paidThrough',
  'pastDueSince',
  'cancelAtPeriodEnd',
  'checkout'
] as const

const same = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : JSON.stringify(a) === JSON.stringify(b)

/** The names of the fields that differ between two versions of the row; the checkout's page counts as the checkout. */
export function changedFields(before: Subscription, after: Subscription): string[] {
  return auditedFields.filter((field) =>
    field === 'checkout'
      ? !same(before.checkout, after.checkout) || !same(before.checkoutPage, after.checkoutPage)
      : !same(before[field], after[field])
  )
}

/**
 * The audit action of a change a provider's notice brought (ADR 0063): what the job did, when it
 * completed or dropped a checkout, otherwise the most telling change of the provider's state. One entry
 * per change, with every field it changed; none when nothing did.
 */
export function syncAction(
  before: Subscription,
  after: Subscription,
  done?: 'activated' | 'plan-changed' | 'checkout-abandoned' | 'upgrade-abandoned'
): AuditAction<'subscription'> | null {
  if (changedFields(before, after).length === 0) return null
  if (done !== undefined) return done
  if (after.status === 'cancelled' && before.status !== 'cancelled') return 'cancelled'
  if (after.status === 'past_due' && before.status !== 'past_due') return 'payment-failed'
  if (after.status === 'active' && before.status === 'past_due') return 'payment-recovered'
  if (after.plan !== before.plan) return 'plan-changed'
  if (after.cancelAtPeriodEnd !== before.cancelAtPeriodEnd) {
    return after.cancelAtPeriodEnd ? 'cancellation-scheduled' : 'cancellation-withdrawn'
  }
  return after.status === 'past_due' ? 'payment-failed' : 'renewed'
}
