import type { Server } from 'node:http'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { isDatabaseUnavailable } from '#libs/database/database'
import { KyselyRateLimiter } from '#libs/database/kysely-rate-limiter'
import { fromFetchHandler } from '#libs/http/fetch-handler'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import type { Clock } from '#libs/ports/clock.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import { kyselyAuditUnitOfWork } from '#modules/audit/database/kysely-audit-unit-of-work'
import { registerAuditRoutes } from '#modules/audit/index'
import { kyselyCustomersUnitOfWork } from '#modules/customers/database/kysely-customers-unit-of-work'
import { registerCustomerRoutes } from '#modules/customers/index'
import { PostgresDatabaseProbe } from '#modules/health/database/postgres-database-probe'
import { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import { GetHealthService } from '#modules/health/queries/get-health/get-health.service'
import { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'
import { createAuth } from '#modules/identity/infrastructure/auth'
import { BetterAuthCurrentSession } from '#modules/identity/infrastructure/better-auth-current-session'
import { KyselyAccountDeletion } from '#modules/identity/infrastructure/kysely-account-deletion'
import { KyselyInvitations } from '#modules/identity/infrastructure/kysely-invitations'
import { KyselyMembership } from '#modules/identity/infrastructure/kysely-membership'
import { KyselyPublicOrganizations } from '#modules/identity/infrastructure/kysely-public-organizations'
import { GetAccountDeletionController } from '#modules/identity/queries/get-account-deletion/get-account-deletion.http-controller'
import { GetIdentityOptionsController } from '#modules/identity/queries/get-identity-options/get-identity-options.http-controller'
import { GetInvitationController } from '#modules/identity/queries/get-invitation/get-invitation.http-controller'
import { GetMeController } from '#modules/identity/queries/get-me/get-me.http-controller'
import { GetMembershipController } from '#modules/identity/queries/get-membership/get-membership.http-controller'
import { GetPublicOrganizationController } from '#modules/identity/queries/get-public-organization/get-public-organization.http-controller'
import { PUBLIC_PATHS, registerRoutes } from './http-routes'

/** Long enough for Neon to wake from suspension, short enough for a status page to wait. */
const DATABASE_PROBE_TIMEOUT_MS = 3_000

export type AppDeps = {
  clock: Clock
  logger: Logger
  serviceName: string
  /** The version running (ADR 0046), answered by `/api/health`. */
  release: string
  /** The web app's origin (ADR 0019): the only one allowed to send writes. */
  webOrigin: string
  /** Web origins allowed to read responses (ADR 0015); `[]` means same origin only. */
  corsOrigins: readonly string[]
  /** Secret the web Worker sends (ADR 0022); `undefined` serves every caller, as in development. */
  proxySecret: string | undefined
  /** The database: adapters behind ports are built on it here (ADR 0013). */
  db: Kysely<unknown>
  /** The job queue on the pool (ADR 0056): identity's emails are enqueued on it (ADR 0057). */
  jobs: JobQueue
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
  release,
  webOrigin,
  corsOrigins,
  proxySecret,
  db,
  jobs,
  authSecret,
  google
}: AppDeps): Server {
  const router = new HttpRouter()
  const databaseProbe = new PostgresDatabaseProbe(db, DATABASE_PROBE_TIMEOUT_MS)
  const auth = createAuth({ db, logger, jobs, webOrigin, secret: authSecret, google })
  const session = new BetterAuthCurrentSession(auth)
  const membership = new KyselyMembership(db)
  // What routes without a session are built from (ADR 0059): the limiter first, then the slug.
  const publicSurface = {
    limiter: new KyselyRateLimiter(db, clock),
    organizations: new KyselyPublicOrganizations(db),
    logger
  }
  registerRoutes(router, {
    getHealth: new GetHealthController(new GetHealthService(clock, { name: serviceName, release }, databaseProbe)),
    getLiveness: new GetLivenessController(),
    auth: fromFetchHandler(auth.handler, webOrigin),
    getMe: new GetMeController(session),
    getAccountDeletion: new GetAccountDeletionController(session, new KyselyAccountDeletion(db)),
    getMembership: new GetMembershipController(session, membership),
    getInvitation: new GetInvitationController(session, new KyselyInvitations(db), membership, clock),
    getIdentityOptions: new GetIdentityOptionsController({ google: google !== undefined }),
    getPublicOrganization: new GetPublicOrganizationController(publicSurface)
  })
  registerCustomerRoutes(router, {
    session,
    membership,
    publicSurface,
    unitOfWork: kyselyCustomersUnitOfWork(db),
    clock,
    ids: new UuidGenerator()
  })
  // The organization's audit trail, read only: every module writes its entries in its own unit of work (ADR 0061).
  registerAuditRoutes(router, { session, membership, unitOfWork: kyselyAuditUnitOfWork(db) })
  return createHttpServer({
    router,
    logger,
    corsOrigins,
    trustedOrigins: [webOrigin],
    proxySecret,
    publicPaths: PUBLIC_PATHS,
    isUnavailable: isDatabaseUnavailable
  })
}
