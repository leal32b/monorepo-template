import type { Clock } from '#libs/ports/clock.port'
import type { RateLimit, RateLimiter, RateLimitVerdict } from '#libs/ports/rate-limiter.port'
import { isOver, keyOf, verdictOf } from '#libs/rate-limit/window'

/** The limiter for tests of routes, under the same contract suite as the database adapter (ADR 0059). */
export class InMemoryRateLimiter implements RateLimiter {
  readonly #counters = new Map<string, { windowStart: Date; count: number }>()
  readonly #clock: Clock

  constructor(clock: Clock) {
    this.#clock = clock
  }

  async hit(limit: RateLimit, subject: string): Promise<RateLimitVerdict> {
    const now = this.#clock.now()
    const key = keyOf(limit, subject)
    const kept = this.#counters.get(key)
    const counter =
      kept === undefined || isOver(limit, kept.windowStart, now)
        ? { windowStart: now, count: 1 }
        : { windowStart: kept.windowStart, count: kept.count + 1 }
    this.#counters.set(key, counter)
    return verdictOf(limit, counter.count, counter.windowStart, now)
  }
}
