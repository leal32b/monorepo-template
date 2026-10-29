import type { Server } from 'node:http'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { fromFetchHandler } from '#libs/http/fetch-handler'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import type { Clock } from '#libs/ports/clock.port'
import type { EmailSender } from '#libs/ports/email-sender.port'
import { PostgresDatabaseProbe } from '#modules/health/database/postgres-database-probe'
import { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import { GetHealthService } from '#modules/health/queries/get-health/get-health.service'
import { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'
import { createAuth } from '#modules/identity/infrastructure/auth'
import { BetterAuthCurrentSession } from '#modules/identity/infrastructure/better-auth-current-session'
import { GetMeController } from '#modules/identity/queries/get-me/get-me.http-controller'
import { PUBLIC_PATHS, registerRoutes } from './http-routes'

/** Long enough for Neon to wake from suspension, short enough for a status page to wait. */
const DATABASE_PROBE_TIMEOUT_MS = 3_000

export type AppDeps = {
  clock: Clock
  logger: Logger
  serviceName: string
  /** The web app's origin (ADR 0019): the only one allowed to send writes. */
  webOrigin: string
  /** Web origins allowed to read responses (ADR 0015); `[]` means same origin only. */
  corsOrigins: readonly string[]
  /** Secret the web Worker sends (ADR 0022); `undefined` serves every caller, as in development. */
  proxySecret: string | undefined
  /** The database: adapters behind ports are built on it here (ADR 0013). */
  db: Kysely<unknown>
  /** Where identity emails go (ADR 0021): Resend, the log, or a test's recorder. */
  emailSender: EmailSender
  /** Better Auth's secret (ADR 0020). */
  authSecret: string
  /** Google sign-in credentials; `undefined` keeps Google off. */
  google: { clientId: string; clientSecret: string } | undefined
}

/**
 * Composition root: the only place that knows concrete classes. It gives each use case exactly
 * the ports it needs and each controller its single use case.
 */
export function createApp({
  clock,
  logger,
  serviceName,
  webOrigin,
  corsOrigins,
  proxySecret,
  db,
  emailSender,
  authSecret,
  google
}: AppDeps): Server {
  const router = new HttpRouter()
  const databaseProbe = new PostgresDatabaseProbe(db, DATABASE_PROBE_TIMEOUT_MS)
  const auth = createAuth({ db, logger, emailSender, webOrigin, secret: authSecret, google })
  registerRoutes(router, {
    getHealth: new GetHealthController(new GetHealthService(clock, serviceName, databaseProbe)),
    getLiveness: new GetLivenessController(),
    auth: fromFetchHandler(auth.handler, webOrigin),
    getMe: new GetMeController(new BetterAuthCurrentSession(auth))
  })
  return createHttpServer({
    router,
    logger,
    corsOrigins,
    trustedOrigins: [webOrigin],
    proxySecret,
    publicPaths: PUBLIC_PATHS
  })
}
