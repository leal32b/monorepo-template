import type { IncomingMessage } from 'node:http'
import { HttpProblem } from '#libs/http/problem'
import type { Actor, CurrentSession } from './current-session.port'

/** The guard for routes that need a session (ADR 0020): the signed-in actor, or a 401. */
export async function requireActor(session: CurrentSession, req: IncomingMessage): Promise<Actor> {
  const actor = await session.actorFor(req.headers)
  if (actor === null) throw new HttpProblem(401, 'unauthenticated', { detail: 'Sign in to continue.' })
  return actor
}
