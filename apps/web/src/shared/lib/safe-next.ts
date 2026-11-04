/**
 * Where to go after signing in: `next` when it is a path on this site, home otherwise, so a link such
 * as `/login?next=https://evil.example` cannot send the user to another site once they are in (T11).
 * The path is read the way the browser reads it, which catches tricks like `//host` and `/\host`.
 */
/**
 * `path` headed on to `next` afterwards (`/login?next=%2Finvitations%2F1`), or `path` alone when `next` is
 * home, so an address only carries a way back when there is one.
 */
export function withNext(path: string, next: string): string {
  return next === '/' ? path : `${path}?next=${encodeURIComponent(next)}`
}

export function safeNext(next: unknown, origin: string): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/'
  const url = new URL(next, origin)
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : '/'
}
