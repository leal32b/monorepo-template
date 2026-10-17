import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Logger } from 'pino'
import { HttpProblem, sendProblem, toProblem } from './problem'
import type { HttpRouter } from './router'

export type HttpServerOptions = {
  router: HttpRouter
  logger: Logger
}

type RequestInfo = { id: string; route: string | null; path: string }

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
 * The HTTP pipeline, in order: request id, routing (404, 405), handler, error boundary.
 * Every failure ends as an RFC 9457 problem response; nothing escapes as an unhandled rejection.
 * One access-log line is written per request; headers and bodies are never logged.
 */
export function createHttpServer({ router, logger }: HttpServerOptions): Server {
  async function dispatch(req: IncomingMessage, res: ServerResponse, request: RequestInfo) {
    const match = router.match(req.method as string, request.path)
    if (match.kind === 'not-found') throw new HttpProblem(404, 'not_found')
    request.route = match.pattern
    if (match.kind === 'method-not-allowed') {
      throw new HttpProblem(405, 'method_not_allowed', {
        headers: { Allow: match.allow.join(', ') }
      })
    }
    await match.handler(req, res, { params: match.params, requestId: request.id })
  }

  return createServer((req, res) => {
    const startedAt = performance.now()
    const request: RequestInfo = {
      id: incomingRequestId(req) ?? randomUUID(),
      route: null,
      path: pathOf(req)
    }
    res.setHeader('X-Request-Id', request.id)

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
