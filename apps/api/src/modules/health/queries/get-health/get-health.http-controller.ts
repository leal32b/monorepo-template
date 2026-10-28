import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { GetHealthService } from './get-health.service'

/** `GET /api/health` */
export class GetHealthController {
  constructor(private readonly service: GetHealthService) {}

  // Arrow property: `this` stays bound when the router calls the handler.
  readonly handle: HttpHandler = async (_req, res) => {
    const health = await this.service.execute()
    // The body says what is down; the status lets monitors and load balancers react without parsing it.
    sendJson(res, health.status === 'ok' ? 200 : 503, health)
  }
}
