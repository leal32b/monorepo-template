import * as z from 'zod/mini'
import { type Money, moneySchema } from './money'
import { instantSchema } from './time'

/**
 * What an organization can or cannot do (ADR 0063): lowercase words with hyphens, named for what each
 * enables, never for a plan or a kind of business. A product adds its own (`group-sessions`).
 */
export const capabilities = ['activity-log'] as const

export type Capability = (typeof capabilities)[number]

/** How many of a resource an organization may hold, named `<resource>.max`; `null` means no limit. */
export const limits = ['customers.max'] as const

export type Limit = (typeof limits)[number]

export type EntitlementKey = Capability | Limit

/** What a plan grants. Code reads it only through `entitlement`, never by the plan's name. */
export type Entitlements = {
  capabilities: readonly Capability[]
  limits: { readonly [L in Limit]: number | null }
}

export type Plan = { price: Money; interval: 'month'; entitlements: Entitlements }

/**
 * The catalogue, read by both apps: a change of price or limit is a deploy, reviewed like any code.
 * Names, prices and numbers are placeholders for the reference module; a product writes its own here.
 * Every plan charges in the same currency, whatever currency an organization keeps for its business.
 */
export const plans = {
  basic: {
    price: { amount: 4900, currency: 'BRL' },
    interval: 'month',
    entitlements: { capabilities: [], limits: { 'customers.max': 100 } }
  },
  pro: {
    price: { amount: 9900, currency: 'BRL' },
    interval: 'month',
    entitlements: { capabilities: ['activity-log'], limits: { 'customers.max': null } }
  }
} as const satisfies Record<string, Plan>

export type PlanKey = keyof typeof plans

export const planKeySchema = z.enum(Object.keys(plans) as [PlanKey, ...PlanKey[]])

/** A new organization's trial: no card, the dearest plan's entitlements. */
export const trial = { days: 14, entitlements: plans.pro.entitlements } as const

/** How long a late payment keeps full access, counted from its due date. */
export const gracePeriod = { days: 14 } as const

/** What the provider says of a subscription, in the template's words (ADR 0063). */
export const subscriptionStatuses = ['trialing', 'active', 'past_due', 'cancelled'] as const

export type SubscriptionStatus = (typeof subscriptionStatuses)[number]

/** What members may do: everything, or read and delete only (`accessOf`). */
export const subscriptionAccesses = ['full', 'read-only'] as const

export type SubscriptionAccess = (typeof subscriptionAccesses)[number]

/** The open checkout's purpose: a first subscription, or the payment of an upgrade's difference. */
export const checkoutKinds = ['subscription', 'upgrade'] as const

export type CheckoutKind = (typeof checkoutKinds)[number]

/** An organization's subscription as the API reads it, with its instants as dates. */
export type SubscriptionState = {
  status: SubscriptionStatus
  /** The plan paid for; null until a checkout is confirmed. */
  plan: PlanKey | null
  /** A downgrade that takes effect at `paidThrough`. */
  nextPlan: PlanKey | null
  trialEndsAt: Date
  periodStartsAt: Date | null
  paidThrough: Date | null
  /** The due date of the oldest unpaid charge; null when nothing is overdue. */
  pastDueSince: Date | null
  cancelAtPeriodEnd: boolean
  checkout: { kind: CheckoutKind; plan: PlanKey; amount: Money } | null
}

const day = 24 * 60 * 60 * 1000

const daysAfter = (date: Date, days: number) => new Date(date.getTime() + days * day)

/**
 * An organization with no subscription row: on trial, from the moment it was created. Creating an
 * organization therefore writes nothing of billing's, and no organization is ever without a state.
 */
export function trialFrom(createdAt: Date): SubscriptionState {
  return {
    status: 'trialing',
    plan: null,
    nextPlan: null,
    trialEndsAt: daysAfter(createdAt, trial.days),
    periodStartsAt: null,
    paidThrough: null,
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: null
  }
}

/**
 * What members may do `now`, by the API's clock: time alone moves an organization into read only,
 * with no job that has to run on time. A date the provider did not give schedules nothing.
 */
export function accessOf(subscription: SubscriptionState, now: Date): SubscriptionAccess {
  const readOnlyFrom = (date: Date | null) => (date !== null && now >= date ? 'read-only' : 'full')
  switch (subscription.status) {
    case 'trialing':
      return readOnlyFrom(subscription.trialEndsAt)
    case 'active':
      return subscription.cancelAtPeriodEnd ? readOnlyFrom(subscription.paidThrough) : 'full'
    case 'past_due':
      return readOnlyFrom(
        subscription.pastDueSince === null ? null : daysAfter(subscription.pastDueSince, gracePeriod.days)
      )
    case 'cancelled':
      return 'read-only'
  }
}

/**
 * What the subscription grants: its plan's entitlements, or the trial's while no plan was paid for.
 * Read only takes nothing away, so a member can still read what the plan let them read.
 */
export function entitlementsOf(subscription: Pick<SubscriptionState, 'plan'>): Entitlements {
  return subscription.plan === null ? trial.entitlements : plans[subscription.plan].entitlements
}

const isLimit = (key: EntitlementKey): key is Limit => (limits as readonly string[]).includes(key)

/**
 * The only way code reads an entitlement (ADR 0063): whether a capability is held, or a limit's
 * number (`null` for none). `holder` is the API's `Member` or the web's membership.
 */
export function entitlement(holder: { entitlements: Entitlements }, key: Capability): boolean
export function entitlement(holder: { entitlements: Entitlements }, key: Limit): number | null
export function entitlement(holder: { entitlements: Entitlements }, key: EntitlementKey): boolean | number | null {
  return isLimit(key) ? holder.entitlements.limits[key] : holder.entitlements.capabilities.includes(key)
}

/**
 * What an upgrade from `from` to `to` charges now (ADR 0063): the difference of the prices for the days
 * left of the paid period, in integer minor units, rounded down so the payer never pays more than the
 * exact share. Days are spans of 24 hours: the period's length rounds to the nearest day, a part of a
 * day left counts as a whole one. A plan that is not dearer, or a period that is over, charges nothing.
 */
export function prorateUpgrade({
  from,
  to,
  periodStartsAt,
  paidThrough,
  now
}: {
  from: PlanKey
  to: PlanKey
  periodStartsAt: Date
  paidThrough: Date
  now: Date
}): Money {
  const { price } = plans[to]
  const difference = price.amount - plans[from].price.amount
  const daysInPeriod = Math.round((paidThrough.getTime() - periodStartsAt.getTime()) / day)
  const daysLeft = Math.min(Math.ceil((paidThrough.getTime() - now.getTime()) / day), daysInPeriod)
  if (difference <= 0 || daysLeft <= 0) return { amount: 0, currency: price.currency }
  return { amount: Math.floor((difference * daysLeft) / daysInPeriod), currency: price.currency }
}

/** A capability or a limit, as a problem names the one that refused (ADR 0063). */
export const entitlementKeySchema = z.enum([...capabilities, ...limits])

const limitSchema = z.nullable(z.int().check(z.gte(0)))

export const entitlementsSchema = z.object({
  capabilities: z.array(z.enum(capabilities)),
  limits: z.object(Object.fromEntries(limits.map((key) => [key, limitSchema])) as Record<Limit, typeof limitSchema>)
})

/**
 * The subscription in the membership read (`organizationMembershipSchema`): its state, the dates the
 * screens write, and `access`, computed with the API's clock so a device with a wrong clock cannot
 * disagree with the API about the last day of a trial. What the web holds is for drawing only.
 */
export const subscriptionSchema = z.object({
  status: z.enum(subscriptionStatuses),
  access: z.enum(subscriptionAccesses),
  plan: z.nullable(planKeySchema),
  nextPlan: z.nullable(planKeySchema),
  trialEndsAt: instantSchema,
  periodStartsAt: z.nullable(instantSchema),
  paidThrough: z.nullable(instantSchema),
  pastDueSince: z.nullable(instantSchema),
  cancelAtPeriodEnd: z.boolean(),
  checkout: z.nullable(z.object({ kind: z.enum(checkoutKinds), plan: planKeySchema, amount: moneySchema }))
})

export type Subscription = z.infer<typeof subscriptionSchema>

/** The codes of the 403s a subscription answers with (ADR 0063); the web says each one. */
export const subscriptionProblems = {
  /** A limit of the plan refuses one more: the problem names the limit and its number. */
  limitReached: 'plan_limit_reached',
  /** The plan lacks the capability the route needs: the problem names it. */
  planRequired: 'plan_required',
  /** The organization is read only: a write waits until a plan is paid for. */
  readOnly: 'subscription_read_only'
} as const

/**
 * How the owner pays (ADR 0064). The provider opens a different page for each: a card subscribes on
 * its hosted checkout, a Pix or a boleto is paid on the charge's own invoice.
 */
export const paymentMethods = ['card', 'pix', 'boleto'] as const

export type PaymentMethod = (typeof paymentMethods)[number]

/** The version of the subscription row the owner read (ADR 0048): 0 while the organization has none, on trial. */
const versionSchema = z.int().check(z.gte(0))

/**
 * A path of the web app, which the API joins to the web origin for the provider to send the owner back
 * to: never a whole URL, so a checkout cannot be made to land on another site.
 */
const webPathSchema = z.string().check(z.regex(/^\/(?![/\\])[^?#\\]*$/), z.maxLength(200))

/**
 * `POST /api/organizations/:organizationId/billing/checkout` (ADR 0063): a first subscription, a new one
 * that replaces it (to pay what is overdue, or to change how to pay), or an upgrade. The owner comes back
 * to `returnTo` with `?checkout=returned`, or `?checkout=cancelled` when they leave the provider's page.
 */
export const billingCheckoutInputSchema = z.object({
  plan: planKeySchema,
  method: z.enum(paymentMethods),
  version: versionSchema,
  returnTo: webPathSchema
})

export type BillingCheckoutInput = z.infer<typeof billingCheckoutInputSchema>

/**
 * `PUT /api/organizations/:organizationId/billing/plan`: a cheaper plan from the end of the paid period,
 * or the current plan again, which withdraws a scheduled change (ADR 0063).
 */
export const billingPlanInputSchema = z.object({ plan: planKeySchema, version: versionSchema })

export type BillingPlanInput = z.infer<typeof billingPlanInputSchema>

/** `POST …/billing/cancel` and `POST …/billing/resume`: the end of the plan at the end of the period, or its withdrawal. */
export const billingVersionInputSchema = z.object({ version: versionSchema })

export type BillingVersionInput = z.infer<typeof billingVersionInputSchema>

/**
 * A page of the provider to send the owner to, or `null`: the answer of a checkout (`null` when the plan
 * changed at once, as an upgrade below the provider's minimum charge does) and of
 * `GET …/billing/payment-page` (`null` when the provider has no page for what is overdue: offer a checkout).
 */
export const billingPageSchema = z.object({ url: z.nullable(z.url({ protocol: /^https?$/ })) })

export type BillingPage = z.infer<typeof billingPageSchema>

/**
 * `GET /api/organizations/:organizationId/billing`, for the plan page of whoever holds `billing:manage`:
 * the subscription as the membership read says it, and what only that page needs.
 */
export const billingSchema = z.object({
  subscription: subscriptionSchema,
  /** What a change of plan, a cancellation and a resumption send back (ADR 0048). */
  version: versionSchema,
  /** The provider's id of the subscription, in small text for a support request; null before the first. */
  reference: z.nullable(z.string()),
  /** The open checkout's page and until when it takes a payment: "Open the payment". */
  checkoutUrl: z.nullable(z.url({ protocol: /^https?$/ })),
  checkoutExpiresAt: z.nullable(instantSchema),
  /** The smallest charge the provider takes: an upgrade that would cost less is free (ADR 0063). */
  minimumCharge: moneySchema
})

export type Billing = z.infer<typeof billingSchema>

/** The codes of the refusals the billing routes answer with, all 409 (ADR 0063); the web says each one. */
export const billingProblems = {
  /** The subscription changed after the owner read it: read it again, then decide (ADR 0048). */
  changed: 'subscription_changed',
  /** Another checkout is open: pay it or cancel it first. */
  checkoutOpen: 'checkout_open',
  /** The open checkout was paid: the plan changes as soon as the provider confirms it. */
  checkoutPaid: 'checkout_paid',
  /** A change of plan, a cancellation or a resumption needs a plan paid for: choose one first. */
  notActive: 'subscription_not_active',
  /** The plan ends at the end of the period: keep it first. */
  cancellationScheduled: 'cancellation_scheduled',
  /** A payment is overdue: pay it first. */
  paymentOverdue: 'payment_overdue',
  /** A dearer plan goes through the checkout, a cheaper one through the plan. */
  wrongDirection: 'plan_change_not_allowed'
} as const

/** What `POST /api/webhooks/<provider>` answers a notice, new, repeated or of a kind not used alike (ADR 0063). */
export const webhookReceiptSchema = z.object({ received: z.literal(true) })

export type WebhookReceipt = z.infer<typeof webhookReceiptSchema>
