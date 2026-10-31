import { createHash, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { HttpProblem } from './problem'

const sha256 = (value: string): Buffer => createHash('sha256').update(value).digest()

/**
 * ADR 0022: a request must carry the web Worker's secret in `X-Proxy-Secret`, except on the public
 * paths. Both values are hashed before `timingSafeEqual`, so the time taken says nothing about the
 * guess, not even its length. Without a secret, as in development, every caller is served.
 */
export function createProxyCheck(
  secret: string | undefined,
  publicPaths: readonly string[]
): (req: IncomingMessage, path: string) => void {
  if (secret === undefined) return () => {}
  const expected = sha256(secret)
  const open = new Set(publicPaths)
  return (req, path) => {
    const given = req.headers['x-proxy-secret']
    if (open.has(path) || (typeof given === 'string' && timingSafeEqual(sha256(given), expected))) return
    throw new HttpProblem(403, 'proxy_required', { detail: 'Call the API through the web app.' })
  }
}

/** Methods that never change state (RFC 9110, section 9.2.1). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** What `Sec-Fetch-Site` says when a page of another origin started the request. */
const OTHER_SITES = new Set(['cross-site', 'same-site'])

/**
 * CSRF defence for writes (threat model T06). Browsers send `Origin` on every write, so a present
 * `Origin` must be trusted, and `null` never is. Without `Origin`, Fetch Metadata still tells a
 * request from another site. A client that sends neither is not a browser, so no cookie was
 * attached on someone else's behalf.
 */
export function assertTrustedOrigin(req: IncomingMessage, trusted: ReadonlySet<string>): void {
  if (SAFE_METHODS.has(req.method as string)) return
  const origin = req.headers.origin
  const site = req.headers['sec-fetch-site']
  const foreign = origin === undefined ? typeof site === 'string' && OTHER_SITES.has(site) : !trusted.has(origin)
  if (foreign) throw new HttpProblem(403, 'origin_not_allowed', { detail: 'Writes come only from the web app.' })
}
