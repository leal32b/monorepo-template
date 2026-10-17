import type { HttpRouter } from '#libs/http/router'
import type { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'

export type Controllers = {
  getHealth: GetHealthController
}

export function registerRoutes(router: HttpRouter, { getHealth }: Controllers): void {
  router.get('/api/health', getHealth.handle)
}
