import type { Server } from 'node:http'
import type { Logger } from 'pino'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import type { Clock } from '#libs/ports/clock.port'
import { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import { GetHealthService } from '#modules/health/queries/get-health/get-health.service'
import { registerRoutes } from './http-routes'

export type AppDeps = {
  clock: Clock
  logger: Logger
  serviceName: string
  /** Web origins allowed to read responses (ADR 0015); `[]` means same origin only. */
  corsOrigins: readonly string[]
}

/**
 * Composition root: the only place that knows concrete classes. It gives each use case exactly
 * the ports it needs and each controller its single use case.
 */
export function createApp({ clock, logger, serviceName, corsOrigins }: AppDeps): Server {
  const router = new HttpRouter()
  registerRoutes(router, {
    getHealth: new GetHealthController(new GetHealthService(clock, serviceName))
  })
  return createHttpServer({ router, logger, corsOrigins })
}
