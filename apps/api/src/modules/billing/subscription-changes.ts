import type { AuditAction } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import { type BillingProvider, BillingProviderUnavailableException } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from './billing.errors'
import { subscriptionEntry } from './billing-audit'
import type { BillingRepositories, BillingUnitOfWork } from './billing-unit-of-work.port'
import { applyProviderState, changedFields, onTrial, type Subscription } from './subscription'

/** The organization's row, or its trial while it has none (ADR 0063): `trialEndsAt` comes from the membership read. */
export function readSubscription(
  unitOfWork: BillingUnitOfWork,
  organizationId: string,
  trialEndsAt: Date,
  now: Date
): Promise<Subscription> {
  return unitOfWork.run(
    organizationId,
    async ({ subscriptions }) => (await subscriptions.find(organizationId)) ?? onTrial(organizationId, trialEndsAt, now)
  )
}

/**
 * Writes one change of the row decided on `read`, after the provider accepted it (ADR 0063): only while
 * the row is still at the version read (ADR 0048), with its audit entry naming the fields it changed, in
 * one transaction. A change that changes nothing writes nothing.
 */
export async function writeChange(
  { unitOfWork, ids }: { unitOfWork: BillingUnitOfWork; ids: IdGenerator },
  read: Subscription,
  change: {
    next: (current: Subscription) => Subscription
    action: AuditAction<'subscription'>
    actor: AuditActor
    at: Date
    /** What the change asks for in the same transaction, once the row is saved. */
    alongside?: ((after: Subscription, repositories: BillingRepositories) => Promise<unknown>) | undefined
  }
): Promise<void> {
  const { organizationId } = read
  await unitOfWork.run(organizationId, async (repositories) => {
    const { subscriptions, audit } = repositories
    const current = await subscriptions.find(organizationId)
    if (current === null || current.version !== read.version) throw new SubscriptionChangedException()
    const after = change.next(current)
    const fields = changedFields(current, after)
    if (fields.length === 0) return
    await audit.record(
      subscriptionEntry(organizationId, {
        id: ids.generate(),
        at: change.at,
        actor: change.actor,
        action: change.action,
        fields
      })
    )
    const saved = await subscriptions.save(after)
    await change.alongside?.(saved, repositories)
  })
}

/**
 * Asks the provider to change when the subscription ends (`call`), then writes the provider's state,
 * the only source of `cancelAtPeriodEnd` (ADR 0063), with the owner's audit entry.
 */
export async function changeEndAtProvider(
  {
    unitOfWork,
    provider,
    clock,
    ids
  }: { unitOfWork: BillingUnitOfWork; provider: BillingProvider; clock: Clock; ids: IdGenerator },
  read: Subscription,
  call: (subscriptionId: string) => Promise<void>,
  change: {
    action: 'cancellation-scheduled' | 'cancellation-withdrawn'
    actor: AuditActor
    alongside?: Parameters<typeof writeChange>[2]['alongside']
  }
): Promise<void> {
  const subscriptionId = read.providerSubscriptionId as string
  await call(subscriptionId)
  const state = await provider.subscription(subscriptionId)
  if (state === null) throw new BillingProviderUnavailableException(`it does not know subscription ${subscriptionId}`)
  const now = clock.now()
  await writeChange({ unitOfWork, ids }, read, {
    next: (current) => applyProviderState(current, state, now),
    ...change,
    at: now
  })
}
