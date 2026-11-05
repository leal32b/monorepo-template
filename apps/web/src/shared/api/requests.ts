import { type Accessor, createSignal } from 'solid-js'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type Requests = {
  /** Whether any request is out: what the progress bar follows. */
  busy: Accessor<boolean>
  /** The same `fetch`, counted while each request is out, failed ones included. */
  track: (fetch: Fetch) => Fetch
}

/**
 * Counts the requests to the server, so the app shows one progress bar for all of them (ADR 0035).
 * Both clients go through the `fetch` this wraps, so no screen has to remember to say it is waiting.
 */
export function createRequests(): Requests {
  const [pending, setPending] = createSignal(0)

  return {
    busy: () => pending() > 0,
    track: (fetch) => async (input, init) => {
      setPending((count) => count + 1)
      try {
        return await fetch(input, init)
      } finally {
        setPending((count) => count - 1)
      }
    }
  }
}
