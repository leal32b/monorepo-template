import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Logger } from 'pino'

/** Small on purpose: one API instance behind Neon's pooled endpoint. */
const MAX_CONNECTIONS = 5

/**
 * How long opening a connection, or waiting for a free one, may take (ADR 0047). Past a database's
 * cold start (Neon wakes in a few seconds), short of the deploy's smoke test (about 25 s).
 */
export const CONNECT_TIMEOUT_MS = 10_000

/**
 * How long the API waits for a statement's answer (ADR 0047). The database itself cancels a statement
 * after 10 s (migration `0005_session_timeouts`); this deadline, a little later, ends the wait when the
 * database cannot even say so, such as a connection lost without a word.
 */
export const QUERY_TIMEOUT_MS = 15_000

export type PoolOptions = {
  /** The client's deadline per statement; `0` waits without limit, as the migrations do. */
  queryTimeoutMs?: number
  /**
   * How many connections the pool opens. One over PGlite's socket server (local development and the
   * end-to-end suite): it is a single session and mixes up the statements of connections that wait
   * behind another's transaction, so the pool must send one thing at a time (ADR 0055).
   */
  maxConnections?: number | undefined
}

/**
 * A `pg` pool for `connectionString`, with the limits of ADR 0047. Neon closes idle connections when
 * it suspends; the pool then emits `error`, which would crash the process if nobody listened, so it
 * is logged instead and the next query opens a new connection.
 */
export function createPool(
  connectionString: string,
  logger: Logger,
  { queryTimeoutMs = QUERY_TIMEOUT_MS, maxConnections = MAX_CONNECTIONS }: PoolOptions = {}
): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: maxConnections,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    query_timeout: queryTimeoutMs
  })
  pool.on('error', (err) => logger.warn({ err }, 'idle database connection lost'))
  return pool
}

/** Kysely over a pool (ADR 0013). `db.destroy()` also ends the pool. */
export function createDatabase<DB>(pool: pg.Pool): Kysely<DB> {
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })
}

/** What `pg` says when one of the limits above ends a wait. */
const TIMEOUT_MESSAGES = new Set([
  'timeout exceeded when trying to connect', // no free connection in time
  'Connection terminated due to connection timeout', // opening one took too long
  'Query read timeout', // the client's deadline per statement
  'Connection terminated unexpectedly' // the server went away mid-statement
])

/**
 * Postgres codes for a database that cannot answer now: a statement or an idle transaction past its
 * limit (57014, 25P03), a server shutting down or starting (57P01 to 57P03), no connection slot left
 * (53300), and the connection-exception class (08...).
 */
const UNAVAILABLE_CODES = /^(57014|25P03|57P0[123]|53300|08\w{3})$/

/** Node's codes for a server out of reach. */
const NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'])

/**
 * Whether `error` says the database is out of reach or did not answer in time, rather than a bug: the
 * HTTP pipeline answers it as a 503 the client may retry (ADR 0047).
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (TIMEOUT_MESSAGES.has(error.message)) return true
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && (UNAVAILABLE_CODES.test(code) || NETWORK_CODES.has(code))
}
