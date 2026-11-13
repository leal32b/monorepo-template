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
