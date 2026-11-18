import type { BillingVersionInput } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from '../../billing.errors'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { canResume } from '../../subscription'
import { changeEndAtProvider, readSubscription } from '../../subscription-changes'

/** "Keep the plan" (ADR 0063): withdraws the end scheduled for the end of the paid period. Asking twice changes nothing. */
export class ResumeSubscriptionService {
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
    if (!canResume(read)) return
    await changeEndAtProvider(this.deps, read, (id) => provider.resume(id), {
      action: 'cancellation-withdrawn',
      actor
    })
  }
}
