import { type Kysely, sql } from 'kysely'
import type { Clock } from '#libs/ports/clock.port'
import type { RateLimit, RateLimiter, RateLimitVerdict } from '#libs/ports/rate-limiter.port'
import { keyOf, verdictOf } from '#libs/rate-limit/window'

/** How long a counter is kept after its window started (ADR 0050); the longest window must fit in it. */
export const rateLimitRetention = { hours: 24 }

/** Rows deleted per statement, so a large backlog never runs into the statement limit (ADR 0047). */
const BATCH_SIZE = 5000

/**
 * Counters in Postgres (ADR 0059): one statement per request, on the pool. The insert starts a
 * counter; on a conflict the row either starts a new window (the old one is over) or counts one
 * more, and both branches read the row as it was before the statement. Postgres locks the row for
 * the update, so requests that arrive together are counted once each.
 */
export class KyselyRateLimiter implements RateLimiter {
  readonly #db: Kysely<unknown>
  readonly #clock: Clock

  constructor(db: Kysely<unknown>, clock: Clock) {
    this.#db = db
    this.#clock = clock
  }

  async hit(limit: RateLimit, subject: string): Promise<RateLimitVerdict> {
    const now = this.#clock.now()
    const over = new Date(now.getTime() - limit.windowSeconds * 1000)
    const { rows } = await sql<{ count: number; window_start: Date }>`
      insert into rate_limit (key, window_start, count) values (${keyOf(limit, subject)}, ${now}, 1)
      on conflict (key) do update set
        count = case when rate_limit.window_start <= ${over} then 1 else rate_limit.count + 1 end,
        window_start = case when rate_limit.window_start <= ${over} then excluded.window_start else rate_limit.window_start end
      returning count, window_start
    `.execute(this.#db)
    const counter = rows[0] as { count: number; window_start: Date } // an upsert always returns its row
    return verdictOf(limit, counter.count, counter.window_start, now)
  }
}

/**
 * Deletes the counters past their keep, as of `now`, in batches, and returns how many went: the
 * limiter's line in the daily purge (ADR 0050).
 */
export async function purgeRateLimits(
  db: Kysely<unknown>,
  now: Date,
  { batchSize = BATCH_SIZE }: { batchSize?: number } = {}
): Promise<number> {
  const before = new Date(now.getTime() - rateLimitRetention.hours * 60 * 60 * 1000)
  let total = 0
  for (;;) {
    const { numAffectedRows } = await sql`
      delete from rate_limit
      where key in (select key from rate_limit where window_start < ${before} limit ${batchSize})
    `.execute(db)
    const deleted = Number(numAffectedRows)
    total += deleted
    if (deleted < batchSize) return total
  }
}
