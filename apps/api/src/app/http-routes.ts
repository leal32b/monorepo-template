import type { HttpHandler, HttpRouter } from '#libs/http/router'
import type { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import type { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'
import type { GetIdentityOptionsController } from '#modules/identity/queries/get-identity-options/get-identity-options.http-controller'
import type { GetMeController } from '#modules/identity/queries/get-me/get-me.http-controller'

/** Read-only routes served without the Worker's secret: Render's health check and the deploy smoke test (ADR 0022). */
export const PUBLIC_PATHS = ['/api/health', '/api/health/live']

export type Controllers = {
  getHealth: GetHealthController
  getLiveness: GetLivenessController
  /** Better Auth's endpoints (ADR 0020), which read their own paths below `/api/auth/`. */
  auth: HttpHandler
  getMe: GetMeController
  getIdentityOptions: GetIdentityOptionsController
}

export function registerRoutes(
  router: HttpRouter,
  { getHealth, getLiveness, auth, getMe, getIdentityOptions }: Controllers
): void {
  router.get('/api/health', getHealth.handle)
  router.get('/api/health/live', getLiveness.handle)
  router.get('/api/auth/*', auth)
  router.post('/api/auth/*', auth)
  router.get('/api/me', getMe.handle)
  router.get('/api/identity/options', getIdentityOptions.handle)
}
