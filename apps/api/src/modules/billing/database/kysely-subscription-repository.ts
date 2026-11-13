import { type PlanKey, plans } from '@repo/contracts'
import type { Kysely, Selectable } from 'kysely'
import { SubscriptionChangedException } from '../billing.errors'
import type { Subscription } from '../subscription'
import type { SubscriptionRepository } from '../subscription-repository.port'

/** The table of `migrations/0013_subscription.sql`. */
export type SubscriptionRow = {
  organization_id: string
  status: Subscription['status']
  plan: PlanKey | null
  next_plan: PlanKey | null
  trial_ends_at: Date
  period_starts_at: Date | null
  paid_through: Date | null
  past_due_since: Date | null
  cancel_at_period_end: boolean
  provider: string | null
  provider_customer_id: string | null
  provider_subscription_id: string | null
  checkout_kind: 'subscription' | 'upgrade' | null
  checkout_plan: PlanKey | null
  checkout_amount: number | null
  checkout_id: string | null
  checkout_url: string | null
  checkout_expires_at: Date | null
  version: number
  created_at: Date
  updated_at: Date
}

type BillingDatabase = { subscription: SubscriptionRow }

/**
 * Postgres through Kysely (ADR 0013). The primary key is the judge of a second first row, and the
 * `where` on the version the judge of a concurrent save (ADR 0048); the code only names the failure.
 */
export class KyselySubscriptionRepository implements SubscriptionRepository {
  readonly #db: Kysely<BillingDatabase>

  constructor(db: Kysely<unknown>) {
    this.#db = db.withTables<BillingDatabase>()
  }

  async find(organizationId: string): Promise<Subscription | null> {
    const row = await this.#db
      .selectFrom('subscription')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .executeTakeFirst()
    return row === undefined ? null : toSubscription(row)
  }

  async save(subscription: Subscription): Promise<Subscription> {
    const { organization_id, version, ...columns } = toRow(subscription)
    const row =
      version === 0
        ? await this.#db
            .insertInto('subscription')
            .values({ organization_id, ...columns, version: 1 })
            .onConflict((conflict) => conflict.column('organization_id').doNothing())
            .returningAll()
            .executeTakeFirst()
        : await this.#db
            .updateTable('subscription')
            .set({ ...columns, version: version + 1 })
            .where('organization_id', '=', organization_id)
            .where('version', '=', version)
            .returningAll()
            .executeTakeFirst()
    if (row === undefined) throw new SubscriptionChangedException()
    return toSubscription(row)
  }
}

function toRow(subscription: Subscription): SubscriptionRow {
  const { checkout, checkoutPage } = subscription
  return {
    organization_id: subscription.organizationId,
    status: subscription.status,
    plan: subscription.plan,
    next_plan: subscription.nextPlan,
    trial_ends_at: subscription.trialEndsAt,
    period_starts_at: subscription.periodStartsAt,
    paid_through: subscription.paidThrough,
    past_due_since: subscription.pastDueSince,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    provider: subscription.provider,
    provider_customer_id: subscription.customerId,
    provider_subscription_id: subscription.providerSubscriptionId,
    checkout_kind: checkout?.kind ?? null,
    checkout_plan: checkout?.plan ?? null,
    checkout_amount: checkout?.amount.amount ?? null,
    checkout_id: checkoutPage?.id ?? null,
    checkout_url: checkoutPage?.url ?? null,
    checkout_expires_at: checkoutPage?.expiresAt ?? null,
    version: subscription.version,
    created_at: subscription.createdAt,
    updated_at: subscription.updatedAt
  }
}

/** A row as the module reads it; the checkout's amount is in the currency of its plan. */
function toSubscription(row: Selectable<SubscriptionRow>): Subscription {
  return {
    organizationId: row.organization_id,
    status: row.status,
    plan: row.plan,
    nextPlan: row.next_plan,
    trialEndsAt: row.trial_ends_at,
    periodStartsAt: row.period_starts_at,
    paidThrough: row.paid_through,
    pastDueSince: row.past_due_since,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    checkout:
      row.checkout_kind === null
        ? null
        : {
            kind: row.checkout_kind,
            plan: row.checkout_plan as PlanKey,
            amount: {
              amount: row.checkout_amount as number,
              currency: plans[row.checkout_plan as PlanKey].price.currency
            }
          },
    checkoutPage:
      row.checkout_id === null
        ? null
        : { id: row.checkout_id, url: row.checkout_url as string, expiresAt: row.checkout_expires_at as Date },
    provider: row.provider,
    customerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
