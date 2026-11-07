import { readStored, store } from '#shared/config'

const KEY = 'session'

/**
 * Keeps on this device that a session was seen here (ADR 0042): only that, never who. The cookie that
 * holds the session cannot be read by the page, so this is how the app knows, before the API answers,
 * whether it is worth asking for what only someone signed in may read. It is a hint, never a source of
 * truth: a stale one costs one refused call, and the session's own answer sets it right.
 */
export function rememberSession(): void {
  store(KEY, 'seen')
}

/** The session is over, or never was: the next visit asks for nothing that needs one. */
export function forgetSession(): void {
  store(KEY, undefined)
}

/** Whether a session was seen on this device and not since ended. */
export function hasSession(): boolean {
  return readStored(KEY) === 'seen'
}
