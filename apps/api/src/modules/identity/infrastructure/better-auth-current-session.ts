import type { IncomingHttpHeaders } from 'node:http'
import { fromNodeHeaders } from 'better-auth/node'
import type { Actor, CurrentSession } from '../current-session.port'
import type { Auth } from './auth'

/** The session row behind the cookie, read with `disableRefresh`: our `GET` routes never write (ADR 0020). */
export class BetterAuthCurrentSession implements CurrentSession {
  constructor(private readonly auth: Auth) {}

  async actorFor(headers: IncomingHttpHeaders): Promise<Actor | null> {
    const found = await this.auth.api.getSession({ headers: fromNodeHeaders(headers), query: { disableRefresh: true } })
    if (found === null) return null
    const { user, session } = found
    return { userId: user.id, email: user.email, name: user.name, signedInAt: session.createdAt }
  }
}
