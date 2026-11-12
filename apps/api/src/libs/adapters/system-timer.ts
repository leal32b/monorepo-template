import type { Timer } from '#libs/ports/timer.port'

/** Real waiting, on `setTimeout`. */
export class SystemTimer implements Timer {
  wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve()
      const end = () => {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', end)
        resolve()
      }
      const timeout = setTimeout(end, ms)
      signal?.addEventListener('abort', end)
    })
  }
}
