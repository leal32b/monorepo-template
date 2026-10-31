import type { IdentityOptions } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'

/** `GET /api/identity/options`: the sign-in methods this deploy offers, fixed when the API starts. */
export class GetIdentityOptionsController {
  constructor(private readonly options: IdentityOptions) {}

  readonly handle: HttpHandler = (_req, res) => sendJson(res, 200, this.options)
}
