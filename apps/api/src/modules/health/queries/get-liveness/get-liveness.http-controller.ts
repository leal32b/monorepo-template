import type { LivenessResponse } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'

/** `GET /api/health/live`: the process answers. No I/O, so platform checks never wake the database. */
export class GetLivenessController {
  readonly handle: HttpHandler = (_req, res) => sendJson(res, 200, { status: 'ok' } satisfies LivenessResponse)
}
