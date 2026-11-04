import type { IncomingMessage } from 'node:http'
import { covers, type Permissions } from '@repo/contracts'
import { HttpProblem } from '#libs/http/problem'
import type { CurrentSession } from './current-session.port'
import type { Member, Membership } from './membership.port'
import { requireActor } from './require-actor'

/**
 * The tenant guard (ADR 0033). `organizationId` comes from the route's path, never from the session.
 * It returns the caller's `Member`, or a problem: 401 without a session, 404 when the caller is not
 * in the organization (whether or not it exists, so ids cannot be probed), 403 when their roles do
 * not hold every permission in `required`.
 */
export async function requireMember(
  deps: { session: CurrentSession; membership: Membership },
  req: IncomingMessage,
  organizationId: string,
  required: Permissions = {}
): Promise<Member> {
  const actor = await requireActor(deps.session, req)
  const member = await deps.membership.memberOf(organizationId, actor.userId)
  if (member === null) {
    throw new HttpProblem(404, 'organization_not_found', { detail: 'No organization of yours has this id.' })
  }
  if (!covers(member.permissions, required)) {
    throw new HttpProblem(403, 'permission_denied', { detail: 'Your role in this organization does not allow this.' })
  }
  return member
}
