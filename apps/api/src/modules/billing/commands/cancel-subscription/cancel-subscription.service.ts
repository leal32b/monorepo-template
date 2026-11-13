import type { BillingVersionInput } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from '../../billing.errors'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { canCancel } from '../../subscription'
import { changeEndAtProvider, readSubscription } from '../../subscription-changes'

/**
 * "Cancel plan" (ADR 0063): the plan ends when the paid period ends, and can be kept until then.
 * Nothing is deleted; the organization is read only from that day. Asking twice changes nothing.
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
      actor
    })
  }
}
