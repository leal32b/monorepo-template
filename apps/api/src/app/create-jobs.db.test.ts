import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import { runMigrations } from '#libs/database/migrations'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { enqueueQueueCheck } from '#modules/health/jobs/queue-check'
import { resetDatabase } from '../../test/reset-database'
import { createJobs } from './create-jobs'

const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const IDLE = 3_600_000
const emailSender = new RecordingEmailSender()

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate job`.execute(db)
})

afterAll(() => db.destroy())

function setup() {
  const clock = new FixedClock(new Date('2026-11-11T09:00:00.000Z'))
  const timer = new ManualTimer(clock)
  const { logger, lines } = memoryLogger()
  return { clock, timer, lines, jobs: createJobs({ db, clock, logger, emailSender, timer, idlePollMs: IDLE }) }
}
const states = async () =>
  (await sql<{ state: string }>`select state from job order by created_at`.execute(db)).rows.map((row) => row.state)

describe('createJobs (ADR 0056)', () => {
  it('runs the queue check the API enqueues as it starts, from the table to the log', async () => {
    const { clock, jobs, lines } = setup()

    await enqueueQueueCheck(jobs.queue, clock, 'test')
    await jobs.worker.drain()

    expect(await states()).toEqual(['done'])
    expect(lines).toMatchObject([
      { enqueuedBy: 'test', waitedMs: 0, msg: 'job queue working' },
      { kind: 'health.queue-check', attempt: 1, msg: 'job done' }
    ])
  })

  it('wakes its sleeping worker when a job is enqueued, with no wait for the idle poll', async () => {
    const { clock, timer, jobs, lines } = setup()
    jobs.worker.start()
    await timer.parked(IDLE)

    await enqueueQueueCheck(jobs.queue, clock, 'test')
    await timer.parked(1_000)

    expect(lines.map((line) => line.msg)).toEqual(['job queue working', 'job done'])
    await jobs.worker.stop()
  })

  it('enqueues on a unit of work’s transaction: kept when it commits, gone when it rolls back', async () => {
    const { clock, jobs } = setup()
    const unitOfWork = new KyselyUnitOfWork(db, (transaction) => ({ jobs: jobs.bind(transaction) }))

    await unitOfWork.run('org-1', (bound) => enqueueQueueCheck(bound.jobs, clock, 'kept'))
    const work = unitOfWork.run('org-1', async (bound) => {
      await enqueueQueueCheck(bound.jobs, clock, 'rolled back')
      throw new Error('the change failed')
    })
    await expect(work).rejects.toThrow('the change failed')
    await jobs.worker.drain()

    expect(await states()).toEqual(['done'])
  })

  it('waits in real time when no timer is given', async () => {
    const { logger } = memoryLogger()
    const jobs = createJobs({ db, clock: new FixedClock(new Date()), logger, emailSender, idlePollMs: IDLE })

    jobs.worker.start()
    await jobs.worker.stop()

    expect(await states()).toEqual([])
  })
})
