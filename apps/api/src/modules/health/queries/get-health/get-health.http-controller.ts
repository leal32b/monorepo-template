import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { GetHealthService } from './get-health.service'

/** `GET /api/health` */
export class GetHealthController {
  constructor(private readonly service: GetHealthService) {}

  // Arrow property: `this` stays bound when the router calls the handler.
  readonly handle: HttpHandler = (_req, res) => sendJson(res, 200, this.service.execute())
}
