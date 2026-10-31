import type { IncomingHttpHeaders } from 'node:http'

/** Who sent the request (ADR 0020). Product modules see this, never Better Auth's types. */
export type Actor = {
  userId: string
  email: string
  name: string
}

/** The session behind a request. */
export interface CurrentSession {
  /** The signed-in actor, or `null`. It never refreshes the session, so a `GET` stays read-only. */
  actorFor(headers: IncomingHttpHeaders): Promise<Actor | null>
}
