import type { Timer } from '#libs/ports/timer.port'
import type { FixedClock } from './fixed-clock'

type Wait = { ms: number; at: number; end: () => void }

/**
 * Waiting for tests, with `FixedClock`: a wait ends when the test advances the time past it, or its
 * signal aborts. `parked(ms)` lets a test wait, without real time, until the code under test is
 * asleep for `ms`.
 */
export class ManualTimer implements Timer {
  readonly #clock: FixedClock
  #waits: Wait[] = []
  #watchers: { ms: number; seen: () => void }[] = []
  /** Every wait ever asked for, in order. */
  readonly asked: number[] = []

  constructor(clock: FixedClock) {
    this.#clock = clock
  }

  /** The waits still open, in the order they were asked for. */
  get pending(): number[] {
    return this.#waits.map((wait) => wait.ms)
  }

  wait(ms: number, signal?: AbortSignal): Promise<void> {
    this.asked.push(ms)
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve()
      const wait: Wait = {
        ms,
        at: this.#clock.now().getTime() + ms,
        end: () => {
          this.#waits = this.#waits.filter((open) => open !== wait)
          resolve()
        }
      }
      this.#waits.push(wait)
      signal?.addEventListener('abort', wait.end)
      const watching = this.#watchers.filter((watcher) => watcher.ms === ms)
      this.#watchers = this.#watchers.filter((watcher) => watcher.ms !== ms)
      for (const watcher of watching) watcher.seen()
    })
  }

  /** Moves the clock forward and ends every wait whose time has come. */
  advance(ms: number): void {
    this.#clock.advance(ms)
    const now = this.#clock.now().getTime()
    for (const wait of this.#waits.filter((open) => open.at <= now)) wait.end()
  }

  /** Resolves once a wait of `ms` is open: at once if one is, or when one is asked for. */
  parked(ms: number): Promise<void> {
    if (this.pending.includes(ms)) return Promise.resolve()
    return new Promise((seen) => {
      this.#watchers.push({ ms, seen })
    })
  }
}
