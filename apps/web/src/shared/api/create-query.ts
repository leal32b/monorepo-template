import { query } from '@solidjs/router'

/**
 * A router query (ADR 0038): an answer is kept for the next read of its key, so the screens share one
 * read, but a failure is not. The next read asks again, whether it is a retry or a session started since
 * a visitor's read, such as the organizations a first load asks for beside the session.
 */
export function createQuery<A extends unknown[], T>(read: (...args: A) => Promise<T>, name: string) {
  const cached = query(
    (...args: A) =>
      read(...args).catch((failure: unknown) => {
        query.delete(cached.keyFor(...args))
        throw failure
      }),
    name
  )
  return cached
}
