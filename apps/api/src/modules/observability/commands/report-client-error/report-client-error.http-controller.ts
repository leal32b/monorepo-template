import { clientErrorReportSchema } from '@repo/contracts'
import type { Logger } from 'pino'
import { readValidJson } from '#libs/http/body'
import { enforceRateLimit } from '#libs/http/rate-limit'
import type { HttpHandler } from '#libs/http/router'
import type { RateLimit, RateLimiter } from '#libs/ports/rate-limiter.port'

/**
 * How much one client address may report (ADR 0072): the page sends at most 5, so this is a few pages' worth
 * in a sitting. A fixed window lets up to twice the number through across its edge.
 */
export const clientErrorLimit = { name: 'client-errors', max: 30, windowSeconds: 600 } as const satisfies RateLimit

/**
 * `POST /api/client-errors`: the browser reports an error it could not handle, and gets `204` (ADR 0072). There is
 * no session and no tenant. The request is counted first, per client address, before the body is read; the body
 * is checked against `clientErrorReportSchema`; and the report becomes one `warn` line whose fields are values,
 * so a message with a line break cannot start a line of its own. Nothing is written beyond the limiter's counter.
 */
export class ReportClientErrorController {
  readonly handle: HttpHandler

  constructor(deps: { limiter: RateLimiter; logger: Logger }) {
    this.handle = async (req, res, ctx) => {
      await enforceRateLimit(deps, req, clientErrorLimit, ctx.requestId)
      const report = await readValidJson(req, clientErrorReportSchema)
      deps.logger.warn(
        {
          reqId: ctx.requestId,
          kind: report.kind,
          clientRelease: report.release,
          route: report.route,
          reference: report.reference,
          clientMessage: report.message,
          clientStack: report.stack
        },
        'client error'
      )
      res.writeHead(204).end()
    }
  }
}
