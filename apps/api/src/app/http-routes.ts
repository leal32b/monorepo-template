import type { HttpRouter } from '#libs/http/router'
import type { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import type { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'

/** Read-only routes served without the Worker's secret: Render's health check and the deploy smoke test (ADR 0022). */
export const PUBLIC_PATHS = ['/api/health', '/api/health/live']

export type Controllers = {
  getHealth: GetHealthController
  getLiveness: GetLivenessController
}

export function registerRoutes(router: HttpRouter, { getHealth, getLiveness }: Controllers): void {
  router.get('/api/health', getHealth.handle)
  router.get('/api/health/live', getLiveness.handle)
}
