import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { JobQueue } from '#libs/ports/job-queue.port'
import { billingKit } from '../../testing/billing-kit'
import { ScheduleTrialReminderService } from './schedule-trial-reminder.service'

describe('ScheduleTrialReminderService (ADR 0073)', () => {
  it('enqueues the reminder of a new organization 3 days before its trial ends', async () => {
    const { clock, ids } = billingKit()
    const jobs = new InMemoryJobs(ids, clock)
    const { logger } = memoryLogger()

    await new ScheduleTrialReminderService(jobs, logger).afterCreate({
      id: 'org-1',
      createdAt: new Date('2026-11-19T12:00:00.000Z')
    })

    expect(jobs.all).toMatchObject([
      {
        kind: 'billing.remind-trial-end',
        state: 'pending',
        runAt: new Date('2026-11-30T12:00:00.000Z'),
        payload: { organizationId: 'org-1', trialEndsAt: '2026-12-03T12:00:00.000Z' }
      }
    ])
  })

  it('logs a reminder it could not enqueue, and leaves the organization created', async () => {
    const failing: JobQueue = {
      enqueue: async () => {
        throw new Error('connection refused')
      }
    }
    const { logger, lines } = memoryLogger()

    await expect(
      new ScheduleTrialReminderService(failing, logger).afterCreate({ id: 'org-1', createdAt: new Date() })
    ).resolves.toBeUndefined()

    expect(lines).toMatchObject([{ level: 50, organizationId: 'org-1', msg: 'trial reminder not scheduled' }])
  })
})
