import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession } from '#modules/identity/current-session.port'
import type { Membership } from '#modules/identity/membership.port'
import { requireMember } from '#modules/identity/require-member'

/**
 * `GET /api/organizations/:organizationId/me`: the caller's roles and resolved permissions in the
 * organization of the path (ADR 0033), in the shape of `OrganizationMembership`. The first route behind the tenant guard: 401 without a session,
 * 404 for a missing or foreign organization.
 */
export class GetMembershipController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const { roles, permissions } = await requireMember(
      { session: this.session, membership: this.membership },
      req,
      params.organizationId as string
    )
    sendJson(res, 200, { roles, permissions })
  }
}
