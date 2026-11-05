import type { IncomingHttpHeaders } from 'node:http'
import type { Actor, CurrentSession } from '../current-session.port'

/** Test double: nobody is signed in until a test sets `actor`. */
export class FakeCurrentSession implements CurrentSession {
  actor: Actor | null = null

  async actorFor(_headers: IncomingHttpHeaders): Promise<Actor | null> {
    return this.actor
  }
}
