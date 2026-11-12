import type { PublicOrganization } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import { type PublicSurface, publicLimits, publicRoute } from '../../public-route'

/**
 * `GET /api/public/organizations/:organizationSlug`: the organization's public profile, with no
 * session (ADR 0059). The projection is written field by field: a column added to the organization
 * never reaches a visitor by accident.
 */
export class GetPublicOrganizationController {
  readonly handle: HttpHandler

  constructor(surface: PublicSurface) {
    this.handle = publicRoute(surface, publicLimits.read, (_req, res, { organization }) => {
      const profile = {
        name: organization.name,
        slug: organization.slug,
        timeZone: organization.timeZone,
        currency: organization.currency
      } as PublicOrganization
      sendJson(res, 200, profile)
    })
  }
}
