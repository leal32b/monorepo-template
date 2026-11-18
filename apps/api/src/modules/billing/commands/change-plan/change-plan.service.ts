import type { BillingPlanInput } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { SubscriptionChangedException } from '../../billing.errors'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { decidePlan, scheduleNextPlan } from '../../subscription'
import { readSubscription, writeChange } from '../../subscription-changes'

/**
 * Choosing a plan through the plan (ADR 0063): a cheaper plan from the end of the paid period, or the
 * current plan again, which withdraws it. Nothing is refunded and nothing is charged now: the
 * organization keeps what it paid for until then. The provider's price for the next charges changes at
 * once, so the first renewal is charged at the new price (ADR 0067); the plan itself changes when the
 * notice of that renewal arrives.
 */
export class ChangePlanService {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly provider: BillingProvider,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(
    organizationId: string,
    { plan, version }: BillingPlanInput,
    actor: AuditActor,
    trialEndsAt: Date
  ): Promise<void> {
    const now = this.clock.now()
    const read = await readSubscription(this.unitOfWork, organizationId, trialEndsAt, now)
    if (read.version !== version) throw new SubscriptionChangedException()
    const decision = decidePlan(read, plan, now)
    if (decision === 'unchanged') return
    const nextPlan = decision === 'downgrade' ? plan : null
    await this.provider.changePlan(read.providerSubscriptionId as string, nextPlan ?? plan)
    await writeChange({ unitOfWork: this.unitOfWork, ids: this.ids }, read, {
      next: (current) => scheduleNextPlan(current, nextPlan, now),
      action: decision === 'downgrade' ? 'downgrade-scheduled' : 'downgrade-withdrawn',
      actor,
      at: now
    })
  }
}
