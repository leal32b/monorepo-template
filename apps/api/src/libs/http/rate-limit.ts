import type { IncomingMessage } from 'node:http'
import type { Logger } from 'pino'
import type { RateLimit, RateLimiter } from '#libs/ports/rate-limiter.port'
import { clientAddressOf } from './client-address'
import { HttpProblem } from './problem'

/** The subject of every request that reports no address: one bucket, so the limit still holds (ADR 0059). */
const UNKNOWN_ADDRESS = 'unknown'

/**
 * Counts the request against `limit` for its client address, and throws `429 rate_limited` with
 * `Retry-After` once the address is past it (ADR 0059). Call it before anything the limit is there
 * to protect: a lookup, the body, the use case. The log line names the limit and never the address.
 */
export async function enforceRateLimit(
  deps: { limiter: RateLimiter; logger: Logger },
  req: IncomingMessage,
  limit: RateLimit,
  requestId: string
): Promise<void> {
  const verdict = await deps.limiter.hit(limit, clientAddressOf(req) ?? UNKNOWN_ADDRESS)
  if (verdict.allowed) return
  const { retryAfterSeconds } = verdict
  deps.logger.warn({ reqId: requestId, limit: limit.name, retryAfterSeconds }, 'rate limited')
  throw new HttpProblem(429, 'rate_limited', {
    detail: `Too many requests from this address. Try again in ${retryAfterSeconds} seconds.`,
    retryAfter: retryAfterSeconds
  })
}
