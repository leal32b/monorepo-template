/**
 * Where to go after signing in: `next` when it is a path on this site, home otherwise, so a link such
 * as `/login?next=https://evil.example` cannot send the user to another site once they are in (T11).
 * The path is read the way the browser reads it, which catches tricks like `//host` and `/\host`.
 */
export function safeNext(next: unknown, origin: string): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/'
  const url = new URL(next, origin)
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : '/'
}
