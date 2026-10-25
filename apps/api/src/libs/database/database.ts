import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Logger } from 'pino'

/** Small on purpose: one API instance behind Neon's pooled endpoint. */
const MAX_CONNECTIONS = 5

/**
 * A `pg` pool for `connectionString`. Neon closes idle connections when it suspends; the pool then
 * emits `error`, which would crash the process if nobody listened, so it is logged instead and the
 * next query opens a new connection.
 */
export function createPool(connectionString: string, logger: Logger): pg.Pool {
  const pool = new pg.Pool({ connectionString, max: MAX_CONNECTIONS })
  pool.on('error', (err) => logger.warn({ err }, 'idle database connection lost'))
  return pool
}

/** Kysely over a pool (ADR 0013). `db.destroy()` also ends the pool. */
export function createDatabase<DB>(pool: pg.Pool): Kysely<DB> {
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })
}
