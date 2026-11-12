import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { enqueueQueueCheck, registerHealthJobs } from './queue-check'

describe('the queue check (ADR 0056)', () => {
  const at = new Date('2026-11-11T09:00:00.000Z')

  it('is enqueued with the release, and its handler says how long the job waited', async () => {
    const clock = new FixedClock(at)
    const jobs = new InMemoryJobs(new UuidGenerator(), clock)
    const registry = new JobRegistry()
    const { logger, lines } = memoryLogger()
    registerHealthJobs(registry, { clock, logger })
    const worker = new JobWorker({ store: jobs, registry, clock, timer: new ManualTimer(clock), logger, idlePollMs: 1 })

    await enqueueQueueCheck(jobs, clock, '3e75fa2')
    clock.advance(1_500)
    await worker.drain()

    expect(jobs.all).toMatchObject([
      { kind: 'health.queue-check', payload: { release: '3e75fa2', enqueuedAt: at.toISOString() }, state: 'done' }
    ])
    expect(lines).toMatchObject([
      { level: 30, enqueuedBy: '3e75fa2', waitedMs: 1_500, msg: 'job queue working' },
      { level: 30, kind: 'health.queue-check', attempt: 1, msg: 'job done' }
    ])
  })
})
