import type { Server } from 'node:http'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { LOCAL_STORAGE_PATH, LocalFileStorage } from '#libs/adapters/local-file-storage'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { isDatabaseUnavailable } from '#libs/database/database'
import { KyselyRateLimiter } from '#libs/database/kysely-rate-limiter'
import { KyselyWebhookInbox } from '#libs/database/kysely-webhook-inbox'
import { fromFetchHandler } from '#libs/http/fetch-handler'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import type { BillingProvider, NoticeSource } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import { StorageOrganizationDeletion } from '#libs/storage/delete-files'
import { kyselyAuditUnitOfWork } from '#modules/audit/database/kysely-audit-unit-of-work'
import { registerAuditRoutes } from '#modules/audit/index'
import { kyselyBillingUnitOfWork } from '#modules/billing/database/kysely-billing-unit-of-work'
import {
  cancelAtProvider,
  EnqueueCancellationService,
  registerBillingRoutes,
  ScheduleTrialReminderService,
  syncPayloadOf,
  syncSubscription
} from '#modules/billing/index'
import { kyselyCustomersUnitOfWork } from '#modules/customers/database/kysely-customers-unit-of-work'
import { registerCustomerRoutes } from '#modules/customers/index'
import { kyselyDataExportUnitOfWork } from '#modules/data-export/database/kysely-data-export-unit-of-work'
import { registerDataExportRoutes } from '#modules/data-export/index'
import { PostgresDatabaseProbe } from '#modules/health/database/postgres-database-probe'
import { GetHealthController } from '#modules/health/queries/get-health/get-health.http-controller'
import { GetHealthService } from '#modules/health/queries/get-health/get-health.service'
import { GetLivenessController } from '#modules/health/queries/get-liveness/get-liveness.http-controller'
import { createAuth } from '#modules/identity/infrastructure/auth'
import { BetterAuthCurrentSession } from '#modules/identity/infrastructure/better-auth-current-session'
import { KyselyAccountDeletion } from '#modules/identity/infrastructure/kysely-account-deletion'
import { KyselyInvitations } from '#modules/identity/infrastructure/kysely-invitations'
import { KyselyMembership } from '#modules/identity/infrastructure/kysely-membership'
import { KyselyOrganizationOwners } from '#modules/identity/infrastructure/kysely-organization-owners'
import { KyselyPublicOrganizations } from '#modules/identity/infrastructure/kysely-public-organizations'
import { GetAccountDeletionController } from '#modules/identity/queries/get-account-deletion/get-account-deletion.http-controller'
import { GetIdentityOptionsController } from '#modules/identity/queries/get-identity-options/get-identity-options.http-controller'
import { GetInvitationController } from '#modules/identity/queries/get-invitation/get-invitation.http-controller'
import { GetMeController } from '#modules/identity/queries/get-me/get-me.http-controller'
import { GetMembershipController } from '#modules/identity/queries/get-membership/get-membership.http-controller'
import { GetPublicOrganizationController } from '#modules/identity/queries/get-public-organization/get-public-organization.http-controller'
import { ReportClientErrorController } from '#modules/observability/commands/report-client-error/report-client-error.http-controller'
import { kyselyOrganizationLogoUnitOfWork } from '#modules/organization-logo/database/kysely-organization-logo-unit-of-work'
import { GetLogoService, registerOrganizationLogoRoutes } from '#modules/organization-logo/index'
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
  /** The queue on a transaction (`createJobs().bind`): a provider's notice and its job are kept together. */
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
  /** Better Auth's secret (ADR 0020). */
  authSecret: string
  /** Google sign-in credentials; `undefined` keeps Google off. */
  google: { clientId: string; clientSecret: string } | undefined
  /** The payment provider the configuration picked (ADR 0063); the job worker holds the same one. */
  billing: BillingProvider & Partial<NoticeSource>
  /** The file store the configuration picked (ADR 0076); the job worker holds the same one. */
  storage: FileStorage
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
  jobsOn,
  authSecret,
  google,
  billing,
  storage
}: AppDeps): Server {
  const router = new HttpRouter()
  const databaseProbe = new PostgresDatabaseProbe(db, DATABASE_PROBE_TIMEOUT_MS)
  const billingUnitOfWork = kyselyBillingUnitOfWork(db, jobsOn)
  // Deleting an organization, alone or with its only member's account, ends its subscription (ADR 0063) and
  // deletes its files (ADR 0076): each listener in turn, before the rows go.
  const listeners = [
    new EnqueueCancellationService(billingUnitOfWork, jobs, clock, cancelAtProvider),
    new StorageOrganizationDeletion(jobs)
  ]
  const organizationDeletion = {
    beforeDelete: async (organizationIds: readonly string[]) => {
      for (const listener of listeners) await listener.beforeDelete(organizationIds)
    }
  }
  // A new organization's trial is recalled 3 days before it ends (ADR 0073).
  const organizationCreation = new ScheduleTrialReminderService(jobs, logger)
  const auth = createAuth({
    db,
    logger,
    clock,
    jobs,
    webOrigin,
    secret: authSecret,
    google,
    organizationDeletion,
    organizationCreation
  })
  const session = new BetterAuthCurrentSession(auth)
  const membership = new KyselyMembership(db, clock)
  const ids = new UuidGenerator()
  // Whom a module tells of its organization's state (ADR 0073): customers and billing write to the owner.
  const owners = new KyselyOrganizationOwners(db)
  // What routes without a session are built from (ADR 0059): the limiter first, then the slug.
  const publicSurface = {
    limiter: new KyselyRateLimiter(db, clock),
    organizations: new KyselyPublicOrganizations(db),
    logger
  }
  // The organization's logo (ADR 0076): its routes, and the read the membership carries.
  const logoUnitOfWork = kyselyOrganizationLogoUnitOfWork(db, jobsOn)
  const getLogo = new GetLogoService({ unitOfWork: logoUnitOfWork, storage, clock })
  registerRoutes(router, {
    getHealth: new GetHealthController(new GetHealthService(clock, { name: serviceName, release }, databaseProbe)),
    getLiveness: new GetLivenessController(),
    auth: fromFetchHandler(auth.handler, webOrigin),
    getMe: new GetMeController(session),
    getAccountDeletion: new GetAccountDeletionController(session, new KyselyAccountDeletion(db, organizationDeletion)),
    getMembership: new GetMembershipController(session, membership, {
      logoOf: (organizationId) => getLogo.execute(organizationId)
    }),
    getInvitation: new GetInvitationController(session, new KyselyInvitations(db), membership, clock),
    getIdentityOptions: new GetIdentityOptionsController({ google: google !== undefined }),
    getPublicOrganization: new GetPublicOrganizationController(publicSurface),
    reportClientError: new ReportClientErrorController({ limiter: publicSurface.limiter, logger })
  })
  registerCustomerRoutes(router, {
    session,
    membership,
    publicSurface,
    unitOfWork: kyselyCustomersUnitOfWork(db, jobsOn),
    clock,
    ids,
    owners,
    webOrigin
  })
  // The organization's audit trail, read only: every module writes its entries in its own unit of work (ADR 0061).
  registerAuditRoutes(router, { session, membership, unitOfWork: kyselyAuditUnitOfWork(db) })
  registerOrganizationLogoRoutes(router, {
    session,
    membership,
    unitOfWork: logoUnitOfWork,
    storage,
    limiter: publicSurface.limiter,
    clock,
    ids
  })
  // The owner's export of the organization's data (ADR 0074): the request, its state and the file.
  registerDataExportRoutes(router, {
    session,
    membership,
    unitOfWork: kyselyDataExportUnitOfWork(db, jobsOn),
    clock,
    ids,
    logger
  })
  // The owner's plan page and the provider's webhook (ADR 0063): the subscription row in billing's unit
  // of work, the provider called outside it, and each notice's event id recorded with its sync job.
  const inbox = new KyselyWebhookInbox({ db, clock, jobsOn, job: syncSubscription, payloadOf: syncPayloadOf })
  billing.listen?.((notice) => inbox.receive(billing.name, notice).then(() => undefined))
  // The local store's addresses are paths of the API (ADR 0076): in development and the suite only, which env
  // validation keeps away from https. Its upload is the one route whose body is not JSON.
  if (storage instanceof LocalFileStorage) {
    router.get(`${LOCAL_STORAGE_PATH}/*`, storage.serve)
    router.on('PUT', `${LOCAL_STORAGE_PATH}/*`, storage.receive, { rawBody: true })
  }
  registerBillingRoutes(router, {
    session,
    membership,
    unitOfWork: billingUnitOfWork,
    provider: billing,
    clock,
    ids,
    webOrigin,
    inbox,
    logger
  })
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
