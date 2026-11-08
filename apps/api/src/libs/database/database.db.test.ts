import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool, isDatabaseUnavailable } from './database'

describe('createDatabase', () => {
  it('runs queries on Postgres through the pg pool', async () => {
    const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

    const { rows } = await sql<{ answer: number }>`select 1 + 1 as answer`.execute(db)
    await db.destroy()

    expect(rows).toEqual([{ answer: 2 }])
  })

  it('ends a statement past its deadline as the database being unavailable', async () => {
    const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' }), { queryTimeoutMs: 50 }))

    const failure = await sql`select pg_sleep(0.5)`.execute(db).catch((error: unknown) => error)
    await db.destroy()

    expect(failure).toBeInstanceOf(Error)
    expect(isDatabaseUnavailable(failure)).toBe(true)
  })
})
