import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from './database'

describe('createDatabase', () => {
  it('runs queries on Postgres through the pg pool', async () => {
    const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

    const { rows } = await sql<{ answer: number }>`select 1 + 1 as answer`.execute(db)
    await db.destroy()

    expect(rows).toEqual([{ answer: 2 }])
  })
})
