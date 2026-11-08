import { query } from '@solidjs/router'
import { type Accessor, createComputed, createResource, createSignal, onCleanup } from 'solid-js'

/** What a query answered last for `key`, if it answered: what a screen read before draws at once. */
function lastAnswer<T>(key: string): T | undefined {
  try {
    return query.get(key) as T | undefined
  } catch {
    // The router throws for a key it never read.
    return undefined
  }
}

/** A change to a key's answer, as an action makes one. */
type Change = (value: unknown) => unknown

/** A screen reading a key: how it draws a change at once, and how it asks for the key again. */
type Reader = { draw: (change: Change) => void; again: () => void }

/** The screens reading each key now; a key no screen reads is not kept. */
const readers = new Map<string, Set<Reader>>()

/** Takes a screen off the readers of `key`, and the key with it when it was the last. */
function leave(reader: Reader, key: string | undefined): void {
  if (key === undefined) return
  // A key a screen registered keeps its set until that screen, the last, leaves it.
  const here = readers.get(key) as Set<Reader>
  here.delete(reader)
  if (here.size === 0) readers.delete(key)
}

/** The keys some screen reads now. */
export function keysRead(): string[] {
  return [...readers.keys()]
}

/**
 * Reads a query in a screen (ADR 0038). A key never read waits under the screen's boundary, which shows
 * its skeleton. A key read before is drawn at once from its last answer and read again behind it, the
 * progress bar showing if that is slow: the router alone reuses a read for a few seconds only. A change
 * an action makes to the key (`updateRead`) is drawn at once.
 *
 * It is the router's `createAsync`, a resource whose source is the query, with what `updateRead` and
 * `readAgain` need kept for them.
 *
 * A key that is a function follows what `read` depends on, such as a page or a filter: the last answer stays
 * drawn while the next one comes, and a change is taken for the key it holds now.
 */
export function createRead<T>(read: () => Promise<T>, key: string | (() => string)): Accessor<T | undefined> {
  const keyOf = typeof key === 'function' ? key : () => key
  const last = lastAnswer<T>(keyOf())
  const [asked, ask] = createSignal(0)
  const [value, { mutate }] = createResource(
    () => {
      // Asked again: read anew, past what the router keeps (`readAgain`).
      asked()
      return read()
    },
    (answer) => answer,
    last === undefined ? {} : { initialValue: last }
  )
  const reader: Reader = {
    draw: (change) => mutate((current) => change(current) as T),
    again: () => ask((times) => times + 1)
  }
  let registered: string | undefined
  createComputed(() => {
    leave(reader, registered)
    registered = keyOf()
    readers.set(registered, (readers.get(registered) ?? new Set()).add(reader))
  })
  onCleanup(() => leave(reader, registered))
  return () => value.latest
}

/**
 * Puts what an action changed into the answer of `key`, on every screen that reads it and for the next
 * read, at once and with no request: a role changed, a person removed.
 */
export function updateRead<T>(key: string, change: (value: T) => T): void {
  const last = lastAnswer<T>(key)
  if (last !== undefined) query.set<unknown>(key, change(last))
  for (const reader of readers.get(key) ?? []) reader.draw(change as Change)
}

/** Asks the API again for `key`, as when an action found the data already changed; screens keep theirs meanwhile. */
export function readAgain(key: string): void {
  query.delete(key)
  for (const reader of readers.get(key) ?? []) reader.again()
}
