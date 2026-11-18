import type { BillingVersionInput } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from '../../billing.errors'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { syncSubscription } from '../../jobs/billing-jobs'
import { canCancel } from '../../subscription'
import { changeEndAtProvider, readSubscription } from '../../subscription-changes'

/**
 * "Cancel plan" (ADR 0063): the plan ends when the paid period ends, and can be kept until then.
 * Nothing is deleted; the organization is read only from that day. Asking twice changes nothing. The
 * sync job is enqueued for that day with the row, since a provider may say nothing when the period
 * ends (Asaas, ADR 0069): it reads the subscription again, and the end lands then.
 */
export class CancelSubscriptionService {
  constructor(
    private readonly deps: { unitOfWork: BillingUnitOfWork; provider: BillingProvider; clock: Clock; ids: IdGenerator }
  ) {}

  async execute(
    organizationId: string,
    { version }: BillingVersionInput,
    actor: AuditActor,
    trialEndsAt: Date
  ): Promise<void> {
    const { unitOfWork, provider, clock } = this.deps
    const read = await readSubscription(unitOfWork, organizationId, trialEndsAt, clock.now())
    if (read.version !== version) throw new SubscriptionChangedException()
    if (!canCancel(read)) return
    await changeEndAtProvider(this.deps, read, (id) => provider.cancel(id, { atPeriodEnd: true }), {
      action: 'cancellation-scheduled',
      actor,
      alongside: (after, { jobs }) => {
        const periodEnd = after.paidThrough as Date
        const subscriptionId = after.providerSubscriptionId as string
        return jobs.enqueue(
          syncSubscription,
          {
            provider: provider.name,
            eventId: `period-end:${subscriptionId}:${periodEnd.toISOString()}`,
            subscriptionId
          },
          { runAt: periodEnd }
        )
      }
    })
  }
}
