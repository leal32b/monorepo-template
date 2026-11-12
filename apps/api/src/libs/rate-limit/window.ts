import type { RateLimit, RateLimitVerdict } from '#libs/ports/rate-limiter.port'

/** The counter of one limit and subject: `public-read:203.0.113.7`. */
export const keyOf = (limit: RateLimit, subject: string): string => `${limit.name}:${subject}`

/** Whether a window that started at `windowStart` is over at `now`. */
export const isOver = (limit: RateLimit, windowStart: Date, now: Date): boolean =>
  now.getTime() - windowStart.getTime() >= limit.windowSeconds * 1000

/** What `count` requests in the window that started at `windowStart` mean for the last of them. */
export function verdictOf(limit: RateLimit, count: number, windowStart: Date, now: Date): RateLimitVerdict {
  if (count <= limit.max) return { allowed: true }
  const leftMs = windowStart.getTime() + limit.windowSeconds * 1000 - now.getTime()
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(leftMs / 1000)) }
}
