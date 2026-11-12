/**
 * The queue's numbers (ADR 0056), in one place. A product changes them here; `maxAttempts` can also be
 * set per kind, on its definition.
 */
export const jobLimits = {
  /** Tries before a job is left as `failed`. */
  maxAttempts: 5,
  /** How long a handler may take. Longer work is split into several jobs. */
  handlerTimeoutMs: 60_000,
  /** How long a claim keeps a job from other workers: past it, a job whose worker died runs again. */
  leaseMs: 120_000,
  /** The wait before the first retry; each later one is four times longer. */
  retryBaseMs: 30_000,
  retryMaxMs: 6 * 60 * 60 * 1000,
  /** The wait after a poll that could not reach the database (ADR 0047). */
  pollRetryMs: 30_000,
  /** How long a stopping worker waits for the job in hand. */
  stopTimeoutMs: 10_000,
  /**
   * After an enqueue in this process wakes the worker, how soon it looks again each time it finds
   * nothing: the job may be in a transaction not committed yet, which can last about 40 s (ADR 0047).
   */
  wakePollsMs: [1_000, 2_000, 4_000, 8_000, 16_000, 32_000]
} as const

/** How long after its `attempt`-th failure a job waits: 30 s, 2 min, 8 min, 32 min, … up to 6 h. */
export function retryDelayMs(attempt: number): number {
  return Math.min(jobLimits.retryBaseMs * 4 ** (attempt - 1), jobLimits.retryMaxMs)
}
