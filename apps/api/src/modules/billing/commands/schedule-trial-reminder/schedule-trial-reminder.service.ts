import { trialFrom } from '@repo/contracts'
import type { Logger } from 'pino'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { OrganizationCreationListener } from '#modules/identity/index'
import { trialReminder } from '../../emails/billing-emails'
import { remindTrialEnd } from '../../jobs/billing-jobs'

const day = 24 * 60 * 60 * 1000

/**
 * A new organization's trial reminder (ADR 0073): enqueued as it is created, to run
 * `trialReminder.daysBefore` days before the trial ends. A reminder that cannot be enqueued is logged
 * at error and leaves the organization created: the screens already show the trial's end.
 */
export class ScheduleTrialReminderService implements OrganizationCreationListener {
  constructor(
    private readonly jobs: JobQueue,
    private readonly logger: Logger
  ) {}

  async afterCreate({ id, createdAt }: { id: string; createdAt: Date }): Promise<void> {
    const { trialEndsAt } = trialFrom(createdAt)
    const runAt = new Date(trialEndsAt.getTime() - trialReminder.daysBefore * day)
    try {
      await this.jobs.enqueue(remindTrialEnd, { organizationId: id, trialEndsAt: trialEndsAt.toISOString() }, { runAt })
    } catch (error) {
      this.logger.error({ err: error, organizationId: id }, 'trial reminder not scheduled')
    }
  }
}
