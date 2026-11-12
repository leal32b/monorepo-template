import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { describeJobs, greet, start } from '#libs/jobs/testing/jobs.contract'
import type { ClaimedJob } from '#libs/ports/job-store.port'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { jobRetention, KyselyJobs, purgeFinishedJobs } from './kysely-jobs'
import { KyselyUnitOfWork } from './kysely-unit-of-work'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const days = (n: number) => new Date(start.getTime() + n * 24 * 60 * 60 * 1000)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate job`.execute(db)
})

afterAll(() => db.destroy())

describeJobs('KyselyJobs', async (ids, clock) => new KyselyJobs(db, ids, clock))

describe('KyselyJobs in a unit of work (ADR 0052)', () => {
  const jobs = new KyselyJobs(db, new UuidGenerator(), new FixedClock(start))
  const unitOfWork = new KyselyUnitOfWork(db, (transaction) => ({
    jobs: new KyselyJobs(transaction, new UuidGenerator(), new FixedClock(start))
  }))

  it('keeps a job enqueued in a transaction that commits', async () => {
    const id = await unitOfWork.run('org-1', (bound) => bound.jobs.enqueue(greet, { name: 'Ada' }))

    expect(await jobs.find(id)).toMatchObject({ kind: 'test.greet', state: 'pending' })
  })

  it('drops a job enqueued in a transaction that rolls back', async () => {
    let id = ''

    const work = unitOfWork.run('org-1', async (bound) => {
      id = await bound.jobs.enqueue(greet, { name: 'Ada' })
      throw new Error('changed my mind')
    })

    await expect(work).rejects.toThrow('changed my mind')
    expect(await jobs.find(id)).toBeUndefined()
    expect(await jobs.claim(start, days(1))).toBeUndefined()
  })
})

describe('purgeFinishedJobs (ADR 0056)', () => {
  const clock = new FixedClock(start)
  const jobs = new KyselyJobs(db, new UuidGenerator(), clock)

  /** A job that ended `state` at `finishedAt`. */
  const finished = async (state: 'done' | 'failed', finishedAt: Date) => {
    const id = await jobs.enqueue(greet, { name: state })
    const claimed = (await jobs.claim(start, days(1))) as ClaimedJob
    await (state === 'done' ? jobs.complete(claimed, finishedAt) : jobs.fail(claimed, finishedAt, 'no'))
    return id
  }
  const kept = async (ids: string[]) => {
    const found = await Promise.all(ids.map((id) => jobs.find(id)))
    return found.map((job) => job !== undefined)
  }

  it('deletes done and failed jobs past their keep, and nothing else', async () => {
    const now = days(100)
    const ids = [
      await finished('done', new Date(days(100 - jobRetention.doneDays).getTime() - 1)),
      await finished('done', days(100 - jobRetention.doneDays)),
      await finished('failed', new Date(days(100 - jobRetention.failedDays).getTime() - 1)),
      await finished('failed', days(100 - jobRetention.failedDays)),
      await jobs.enqueue(greet, { name: 'pending for ever' })
    ]

    expect(await purgeFinishedJobs(db, now)).toEqual({ done: 1, failed: 1 })
    expect(await kept(ids)).toEqual([false, true, false, true, true])
    expect(await purgeFinishedJobs(db, now)).toEqual({ done: 0, failed: 0 })
  })

  it('works through a backlog larger than one batch', async () => {
    for (let n = 0; n < 5; n++) await finished('done', start)

    expect(await purgeFinishedJobs(db, days(100), { batchSize: 2 })).toEqual({ done: 5, failed: 0 })
  })
})
