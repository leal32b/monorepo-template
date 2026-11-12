import type { HttpHandler, HttpRouter } from '#libs/http/router'
import type { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import type { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'
import type { GetAccountDeletionController } from '#modules/identity/queries/get-account-deletion/get-account-deletion.http-controller'
import type { GetIdentityOptionsController } from '#modules/identity/queries/get-identity-options/get-identity-options.http-controller'
import type { GetInvitationController } from '#modules/identity/queries/get-invitation/get-invitation.http-controller'
import type { GetMeController } from '#modules/identity/queries/get-me/get-me.http-controller'
import type { GetMembershipController } from '#modules/identity/queries/get-membership/get-membership.http-controller'
import type { GetPublicOrganizationController } from '#modules/identity/queries/get-public-organization/get-public-organization.http-controller'

/**
 * Read-only routes served without the Worker's secret: Render's health check and the deploy smoke test
 * (ADR 0022). Not the public tenant surface (`/api/public/...`, ADR 0059), which has no session but
 * still comes through the Worker.
 */
export const PUBLIC_PATHS = ['/api/health', '/api/health/live']

export type Controllers = {
  getHealth: GetHealthController
  getLiveness: GetLivenessController
  /** Better Auth's endpoints (ADR 0020), which read their own paths below `/api/auth/`. */
  auth: HttpHandler
  getMe: GetMeController
  getAccountDeletion: GetAccountDeletionController
  getMembership: GetMembershipController
  getInvitation: GetInvitationController
  getIdentityOptions: GetIdentityOptionsController
  getPublicOrganization: GetPublicOrganizationController
}

export function registerRoutes(
  router: HttpRouter,
  {
    getHealth,
    getLiveness,
    auth,
    getMe,
    getAccountDeletion,
    getMembership,
    getInvitation,
    getIdentityOptions,
    getPublicOrganization
  }: Controllers
): void {
  router.get('/api/health', getHealth.handle)
  router.get('/api/health/live', getLiveness.handle)
  router.get('/api/auth/*', auth)
  router.post('/api/auth/*', auth)
  router.get('/api/me', getMe.handle)
  router.get('/api/me/account-deletion', getAccountDeletion.handle)
  router.get('/api/organizations/:organizationId/me', getMembership.handle)
  router.get('/api/invitations/:invitationId', getInvitation.handle)
  router.get('/api/identity/options', getIdentityOptions.handle)
  router.get('/api/public/organizations/:organizationSlug', getPublicOrganization.handle)
}
