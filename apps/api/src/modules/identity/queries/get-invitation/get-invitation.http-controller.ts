import type { Invitation } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import type { HttpHandler } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { CurrentSession } from '#modules/identity/current-session.port'
import type { Invitations } from '#modules/identity/invitations.port'
import type { Membership } from '#modules/identity/membership.port'
import { requireActor } from '#modules/identity/require-actor'
import { invitationStatus } from './invitation-status'

/**
 * `GET /api/invitations/:invitationId`: an invitation as its recipient sees it, in the shape of
 * `Invitation`, so the web can say what to do whether it is open, expired, used, declined or
 * withdrawn (ADR 0033, D5). 401 without a session; 404 for an id that does not exist; 403 for an
 * account the invitation was not sent to, which learns nothing about it. Accepting and declining
 * stay with the plugin.
 */
export class GetInvitationController {
  constructor(
    private readonly session: CurrentSession,
    private readonly invitations: Invitations,
    private readonly membership: Membership,
    private readonly clock: Clock
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const actor = await requireActor(this.session, req)
    const invitation = await this.invitations.find(params.invitationId as string)
    if (invitation === null) {
      throw new HttpProblem(404, 'invitation_not_found', { detail: 'There is no invitation with this link.' })
    }
    if (invitation.email.toLowerCase() !== actor.email.toLowerCase()) {
      throw new HttpProblem(403, 'not_the_recipient', { detail: 'This invitation was sent to another address.' })
    }
    const member = await this.membership.memberOf(invitation.organizationId, actor.userId)
    sendJson(res, 200, {
      id: invitation.id,
      organizationName: invitation.organizationName,
      organizationSlug: invitation.organizationSlug,
      inviterName: invitation.inviterName,
      status: invitationStatus(invitation.status, invitation.expiresAt, this.clock.now()),
      expiresAt: invitation.expiresAt.toISOString(),
      member: member !== null
    } satisfies Invitation)
  }
}
