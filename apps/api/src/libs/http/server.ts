import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Logger } from 'pino'
import { assertAcceptableBody } from './body'
import { applyCors, preflightHeaders } from './cors'
import { HttpProblem, sendProblem, toProblem } from './problem'
import { assertTrustedOrigin, createProxyCheck } from './request-guards'
import type { HttpRouter } from './router'

export type HttpServerOptions = {
  router: HttpRouter
  logger: Logger
  /** Web origins allowed to read responses (ADR 0015). None by default: same origin only. */
  corsOrigins?: readonly string[]
  /** Origins whose pages may send writes (threat model T06). None by default: only non-browser clients. */
  trustedOrigins?: readonly string[]
  /** Secret the web Worker sends (ADR 0022). Unset by default: every caller is served. */
  proxySecret?: string | undefined
  /** Paths served without the Worker's secret: the read-only health routes. */
  publicPaths?: readonly string[]
}

/**
 * Sent on every response (OWASP REST Security Cheat Sheet): never cached, never run or framed as a
 * page, never sniffed as another type, never embedded by another site.
 */
const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff'
}

type RequestInfo = { id: string; route: string | null; path: string; corsAllowed: boolean }

const REQUEST_ID = /^[\w.-]{1,128}$/

/** The client's `X-Request-Id` when it is well formed; otherwise `null`. */
function incomingRequestId(req: IncomingMessage): string | null {
  const value = req.headers['x-request-id']
  return typeof value === 'string' && REQUEST_ID.test(value) ? value : null
}

/** Path of the request target, without the query string. */
function pathOf(req: IncomingMessage): string {
  const url = req.url as string // always set on a server request
  const queryStart = url.indexOf('?')
  return queryStart === -1 ? url : url.slice(0, queryStart)
}

/**
 * The HTTP pipeline, in order: request id, security headers, CORS, the Worker's secret, the origin
 * of writes, routing (404, 405, OPTIONS), body headers, handler, error boundary. Every failure ends
 * as an RFC 9457 problem response; nothing escapes as an unhandled rejection. One access-log line
 * is written per request; headers and bodies are never logged.
 */
export function createHttpServer({
  router,
  logger,
  corsOrigins = [],
  trustedOrigins = [],
  proxySecret,
  publicPaths = []
}: HttpServerOptions): Server {
  const allowlist = new Set(corsOrigins)
  const trusted = new Set(trustedOrigins)
  const checkProxy = createProxyCheck(proxySecret, publicPaths)
  async function dispatch(req: IncomingMessage, res: ServerResponse, request: RequestInfo) {
    checkProxy(req, request.path)
    assertTrustedOrigin(req, trusted)
    const match = router.match(req.method as string, request.path)
    if (match.kind === 'not-found') throw new HttpProblem(404, 'not_found')
    request.route = match.pattern
    if (match.kind === 'method-not-allowed') {
      const allow = match.allow.join(', ')
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { Allow: allow, ...preflightHeaders(req, request.corsAllowed, allow) })
        res.end()
        return
      }
      throw new HttpProblem(405, 'method_not_allowed', { headers: { Allow: allow } })
    }
    assertAcceptableBody(req)
    await match.handler(req, res, { params: match.params, requestId: request.id })
  }

  return createServer((req, res) => {
    const startedAt = performance.now()
    const request: RequestInfo = {
      id: incomingRequestId(req) ?? randomUUID(),
      route: null,
      path: pathOf(req),
      corsAllowed: false
    }
    res.setHeader('X-Request-Id', request.id)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value)
    request.corsAllowed = applyCors(req, res, allowlist)

    res.on('finish', () => {
      const line = {
        reqId: request.id,
        method: req.method,
        route: request.route,
        path: request.path,
        status: res.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10
      }
      if (res.statusCode >= 500) logger.error(line, 'request failed')
      else if (res.statusCode >= 400) logger.warn(line, 'request rejected')
      else logger.info(line, 'request')
    })

    dispatch(req, res, request).catch((err: unknown) => {
      const { problem, expected } = toProblem(err)
      if (!expected) logger.error({ reqId: request.id, err }, 'unhandled error in request handler')
      if (res.headersSent) {
        res.destroy() // too late for a clean error: cut the connection
        return
      }
      sendProblem(res, problem, request.id)
    })
  })
}
