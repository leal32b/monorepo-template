import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Sets the CORS headers of a response for an exact allowlist of web origins (ADR 0015) and tells
 * whether the request's origin is allowed. CORS only tells the browser who may read the response;
 * it is not access control, so the request is served either way.
 */
export function applyCors(req: IncomingMessage, res: ServerResponse, allowlist: ReadonlySet<string>): boolean {
  res.setHeader('Vary', 'Origin') // the answer depends on Origin: caches must not share it across sites
  const origin = req.headers.origin
  if (origin === undefined || !allowlist.has(origin)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id')
  return true
}

/** Request headers a web client may send beyond the CORS-safelisted ones. */
const ALLOWED_HEADERS = 'Content-Type, X-Request-Id'

/** How long a browser may reuse a preflight answer (Chrome caps it at 2 hours). */
const MAX_AGE_SECONDS = 600

/**
 * Extra headers of an OPTIONS answer when it is a preflight (it carries
 * `Access-Control-Request-Method`) from an allowed origin; otherwise none.
 */
export function preflightHeaders(
  req: IncomingMessage,
  originAllowed: boolean,
  methods: string
): Record<string, string> {
  if (!originAllowed || req.headers['access-control-request-method'] === undefined) return {}
  return {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': String(MAX_AGE_SECONDS)
  }
}
