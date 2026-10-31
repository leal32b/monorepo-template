import type { MeResponse } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession } from '#modules/identity/current-session.port'
import { requireActor } from '#modules/identity/require-actor'

/** `GET /api/me`: who is signed in, or a 401. The example of a route behind the session guard. */
export class GetMeController {
  constructor(private readonly session: CurrentSession) {}

  readonly handle: HttpHandler = async (req, res) => {
    const { userId, email, name } = await requireActor(this.session, req)
    sendJson(res, 200, { id: userId, email, name } satisfies MeResponse)
  }
}
