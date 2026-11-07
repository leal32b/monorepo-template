type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/**
 * How long a read waits for the server before it gives up (ADR 0041). A server asleep wakes in about a
 * minute, so this is a little longer; past it the wait is a failure the screen can say, with its retry.
 */
export const readTimeout = 90_000

/**
 * The same `fetch`, with a time limit on reads. A read that the server does not answer in time fails like
 * any other unreachable server, so the screen waiting on it says so instead of waiting for ever. Writes
 * keep no limit: one may have happened even if its answer is late, and saying it failed would invite a
 * second try.
 */
export function limitReads(fetch: Fetch, limit: number = readTimeout): Fetch {
  return (input, init) => {
    if ((init?.method ?? 'GET').toUpperCase() !== 'GET') return fetch(input, init)
    const timeout = AbortSignal.timeout(limit)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    return fetch(input, { ...init, signal })
  }
}
