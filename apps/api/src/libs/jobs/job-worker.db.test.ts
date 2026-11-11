import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import { runMigrations } from '#libs/database/migrations'
import type { JobHandler } from '#libs/ports/job-queue.port'
import { resetDatabase } from '../../../test/reset-database'
import { jobLimits } from './job-limits'
import { JobRegistry } from './job-registry'
import { JobWorker } from './job-worker'
import { greet, start } from './testing/jobs.contract'
import { memoryLogger } from './testing/memory-logger'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate job`.execute(db)
})

afterAll(() => db.destroy())

/** The queue on Postgres, with one or more workers that share a clock the test moves. */
function setup(handler: JobHandler<{ name: string }>) {
  const clock = new FixedClock(start)
  const ids = new UuidGenerator()
  const jobs = new KyselyJobs(db, ids, clock)
  const registry = new JobRegistry()
  registry.register(greet, handler)
  const { logger, lines } = memoryLogger()
  const worker = () =>
    new JobWorker({ store: jobs, registry, clock, timer: new ManualTimer(clock), logger, idlePollMs: 3_600_000 })
  const unitOfWork = new KyselyUnitOfWork(db, (transaction) => ({ jobs: new KyselyJobs(transaction, ids, clock) }))
  return { clock, jobs, lines, worker, unitOfWork }
}

describe('the job queue on Postgres (ADR 0056)', () => {
  it('runs a job that fails once again after its backoff, and it succeeds on the retry', async () => {
    const attempts: number[] = []
    const { clock, jobs, worker, lines } = setup(async (_payload, { attempt }) => {
      attempts.push(attempt)
      if (attempt === 1) throw new Error('the provider said no')
    })
    const id = await jobs.enqueue(greet, { name: 'Ada' })
    const one = worker()

    await one.drain()
    expect(await jobs.find(id)).toMatchObject({ state: 'pending', attempts: 1, lastError: 'the provider said no' })

    clock.advance(29_999)
    await one.drain()
    expect(attempts).toEqual([1])

    clock.advance(1)
    await one.drain()

    expect(attempts).toEqual([1, 2])
    expect(await jobs.find(id)).toMatchObject({ state: 'done', attempts: 2 })
    expect(lines.map((line) => line.msg)).toEqual(['job attempt failed', 'job done'])
  })

  it('leaves a job that keeps failing in the failed state, with an error line in the log', async () => {
    const { clock, jobs, worker, lines } = setup(async () => {
      throw new Error('the provider is gone')
    })
    const id = await jobs.enqueue(greet, { name: 'Ada' })
    const one = worker()

    for (let attempt = 1; attempt <= jobLimits.maxAttempts; attempt++) {
      await one.drain()
      clock.advance(jobLimits.retryMaxMs)
    }
    await one.drain()

    expect(await jobs.find(id)).toMatchObject({
      state: 'failed',
      attempts: jobLimits.maxAttempts,
      lastError: 'the provider is gone'
    })
    expect(lines.at(-1)).toMatchObject({
      level: 50,
      jobId: id,
      kind: 'test.greet',
      attempt: jobLimits.maxAttempts,
      err: { message: 'the provider is gone' },
      msg: 'job failed'
    })
    expect(lines).toHaveLength(jobLimits.maxAttempts)
  })

  it('does not run a delayed job before its time', async () => {
    const ran: string[] = []
    const { clock, jobs, worker } = setup(async ({ name }) => {
      ran.push(name)
    })
    await jobs.enqueue(greet, { name: 'reminder' }, { runAt: new Date(start.getTime() + 3_600_000) })
    const one = worker()

    clock.advance(3_599_999)
    await one.drain()
    expect(ran).toEqual([])

    clock.advance(1)
    await one.drain()
    expect(ran).toEqual(['reminder'])
  })

  it('never lets two workers run the same job, at once or one after the other', async () => {
    const runs = new Map<string, number>()
    const { jobs, worker } = setup(async (_payload, { jobId }) => {
      runs.set(jobId, (runs.get(jobId) ?? 0) + 1)
      // Give way, so the other worker asks for work while this job is in hand.
      await new Promise((resolve) => setImmediate(resolve))
    })
    const ids = []
    for (let n = 0; n < 12; n++) ids.push(await jobs.enqueue(greet, { name: `job ${n}` }))

    await Promise.all([worker().drain(), worker().drain(), worker().drain()])

    expect([...runs.keys()].sort()).toEqual([...ids].sort())
    expect([...runs.values()]).toEqual(Array(12).fill(1))
  })

  it('never runs a job whose enqueue was rolled back with its transaction', async () => {
    const ran: string[] = []
    const { jobs, worker, unitOfWork } = setup(async ({ name }) => {
      ran.push(name)
    })

    await unitOfWork.run((bound) => bound.jobs.enqueue(greet, { name: 'kept' }))
    const work = unitOfWork.run(async (bound) => {
      await bound.jobs.enqueue(greet, { name: 'rolled back' })
      throw new Error('the change failed')
    })
    await expect(work).rejects.toThrow('the change failed')
    await worker().drain()

    expect(ran).toEqual(['kept'])
    expect(await jobs.nextDueAt()).toBeUndefined()
  })
})
