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
 *
 * The count is a plain number, not a signal: a request often starts inside a transition (a navigation
 * of the router), and Solid 1 keeps a signal written there aside until the transition commits, so the
 * bar would not see it and the count would end below zero (ADR 0038). Readers are told of a change in a
 * microtask, which runs after the transition's own work, never inside it.
 */
export function createRequests(): Requests {
  let pending = 0
  const [changed, setChanged] = createSignal(undefined, { equals: false })
  const tell = () => queueMicrotask(() => setChanged())

  return {
    busy: () => {
      changed()
      return pending > 0
    },
    track: (fetch) => async (input, init) => {
      pending += 1
      tell()
      try {
        return await fetch(input, init)
      } finally {
        pending -= 1
        tell()
      }
    }
  }
}
