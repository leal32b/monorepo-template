/** A named ceiling (ADR 0059): at most `max` requests per subject in each window of `windowSeconds`. */
export type RateLimit = {
  /** Part of the counter's key and of the log line: `public-read`. */
  name: string
  max: number
  windowSeconds: number
}

export type RateLimitVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/**
 * Counts requests per limit and subject in fixed windows (ADR 0059). The first request of a subject
 * starts its window; every request counts, refused ones included; past the window the next request
 * starts a new one. The counters outlive the process and are shared by every instance.
 */
export interface RateLimiter {
  /** Counts one request of `subject` against `limit` and says whether it is within it. */
  hit(limit: RateLimit, subject: string): Promise<RateLimitVerdict>
}
