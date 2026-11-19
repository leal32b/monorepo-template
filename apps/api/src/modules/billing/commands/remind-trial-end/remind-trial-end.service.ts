import type { Clock } from '#libs/ports/clock.port'
import type { OrganizationOwners } from '#modules/identity/index'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { billingEmails, trialEndingEmail } from '../../emails/billing-emails'

/** What the reminder is given when the organization is created: which one, and when its trial ends. */
export type RemindTrialEnd = { organizationId: string; trialEndsAt: string }

/**
 * The trial's reminder, on its day (ADR 0073). It reads the row again: an organization that paid for a
 * plan meanwhile, whose trial already ended, or that is gone (no owner), gets nothing. Otherwise the
 * owner's email is enqueued in the same transaction as the read.
 */
export class RemindTrialEndService {
  constructor(
    private readonly deps: {
      unitOfWork: BillingUnitOfWork
      owners: OrganizationOwners
      clock: Clock
      webOrigin: string
    }
  ) {}

  async execute({ organizationId, trialEndsAt }: RemindTrialEnd): Promise<void> {
    const { unitOfWork, owners, clock, webOrigin } = this.deps
    const ends = new Date(trialEndsAt)
    if (clock.now() >= ends) return
    const owner = await owners.ownerOf(organizationId)
    if (owner === null) return
    await unitOfWork.run(organizationId, async ({ subscriptions, jobs }) => {
      const row = await subscriptions.find(organizationId)
      if (row !== null && row.status !== 'trialing') return
      await jobs.enqueue(billingEmails.job, trialEndingEmail(owner, ends, webOrigin))
    })
  }
}
