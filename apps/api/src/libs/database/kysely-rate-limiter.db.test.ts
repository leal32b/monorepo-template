import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { describeRateLimiter, start } from '#libs/rate-limit/testing/rate-limiter.contract'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { KyselyRateLimiter, purgeRateLimits, rateLimitRetention } from './kysely-rate-limiter'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const hours = (n: number) => new Date(start.getTime() + n * 60 * 60 * 1000)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

beforeEach(async () => {
  await sql`truncate rate_limit`.execute(db)
})

afterAll(() => db.destroy())

describeRateLimiter('KyselyRateLimiter', async (clock) => new KyselyRateLimiter(db, clock))

describe('KyselyRateLimiter', () => {
  it('keeps one row per limit and subject, whose key names both', async () => {
    const limiter = new KyselyRateLimiter(db, new FixedClock(start))
    const limit = { name: 'public-read', max: 2, windowSeconds: 60 }
    await limiter.hit(limit, '203.0.113.7')
    await limiter.hit(limit, '203.0.113.7')
    await limiter.hit(limit, '203.0.113.7')

    const { rows } = await sql`select key, count, window_start from rate_limit`.execute(db)

    expect(rows).toEqual([{ key: 'public-read:203.0.113.7', count: 3, window_start: start }])
  })

  it('counts requests that arrive together once each', async () => {
    const limiter = new KyselyRateLimiter(db, new FixedClock(start))
    const limit = { name: 'together', max: 5, windowSeconds: 60 }

    const verdicts = await Promise.all(Array.from({ length: 8 }, () => limiter.hit(limit, 'a')))

    expect(verdicts.filter((verdict) => verdict.allowed)).toHaveLength(5)
  })
})

describe('purgeRateLimits (ADR 0050)', () => {
  const counter = (key: string, windowStart: Date) =>
    sql`insert into rate_limit (key, window_start, count) values (${key}, ${windowStart}, 1)`.execute(db)
  const keys = async () =>
    (await sql<{ key: string }>`select key from rate_limit order by key`.execute(db)).rows.map((row) => row.key)

  it('deletes the counters whose window started before the keep, in batches, and says how many', async () => {
    const keep = rateLimitRetention.hours
    await counter('old-1', hours(-keep - 1))
    await counter('old-2', hours(-keep - 2))
    await counter('old-3', hours(-keep - 30))
    await counter('recent', hours(-keep + 1))

    expect(await purgeRateLimits(db, start, { batchSize: 2 })).toBe(3)
    expect(await keys()).toEqual(['recent'])
    expect(await purgeRateLimits(db, start)).toBe(0)
  })
})
