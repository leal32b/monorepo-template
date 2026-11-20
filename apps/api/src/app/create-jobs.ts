import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { SystemTimer } from '#libs/adapters/system-timer'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { WakingJobQueue } from '#libs/jobs/waking-job-queue'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { EmailSender } from '#libs/ports/email-sender.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { Timer } from '#libs/ports/timer.port'
import { registerStorageJobs } from '#libs/storage/delete-files'
import { kyselyBillingUnitOfWork } from '#modules/billing/database/kysely-billing-unit-of-work'
import { billingEmails, registerBillingJobs } from '#modules/billing/index'
import { KyselyBillingDirectory } from '#modules/billing/infrastructure/kysely-billing-directory'
import { customersEmails } from '#modules/customers/index'
import { kyselyDataExportUnitOfWork } from '#modules/data-export/database/kysely-data-export-unit-of-work'
import { dataExportEmails, registerDataExportJobs } from '#modules/data-export/index'
import { KyselyOrganizationDirectory } from '#modules/data-export/infrastructure/kysely-organization-directory'
import { registerHealthJobs } from '#modules/health/jobs/queue-check'
import { KyselyOrganizationOwners } from '#modules/identity/infrastructure/kysely-organization-owners'
import { registerIdentityJobs } from '#modules/identity/jobs/send-email'

export type JobsDeps = {
  db: Kysely<unknown>
  clock: Clock
  logger: Logger
  /** Where every module's emails go (ADR 0021, ADR 0073): the process that runs the jobs sends them (ADR 0057). */
  emailSender: EmailSender
  /** The payment provider a notice's sync reads (ADR 0063): the same instance the app was given. */
  billing: BillingProvider
  /** The file store (ADR 0076): the export is written there, and files are deleted from it by jobs. */
  storage: FileStorage
  /** The web app's origin (ADR 0019): the buttons of billing's emails open it (ADR 0073). */
  webOrigin: string
  /** How the worker waits; real time unless a test says otherwise. */
  timer?: Timer
  /** The longest an idle worker sleeps before it looks again (`JOB_IDLE_POLL_SECONDS`). */
  idlePollMs: number
}

export type Jobs = {
  /** Enqueues at once, outside any transaction. */
  queue: JobQueue
  /** The queue on a unit of work's transaction (ADR 0052): the job is kept or dropped with it. */
  bind(transaction: Kysely<unknown>): JobQueue
  /** Not started: the entry point decides (`JOB_WORKER`), and stops it on shutdown. */
  worker: JobWorker
}

/**
 * The composition root's half for background work (ADR 0056): the queue, the worker, and every
 * module's handlers. A module with job kinds adds its `registerXJobs` here, with the ports its
 * handlers need. The API process and the worker process both build this, so either can run the jobs.
 */
export function createJobs({
  db,
  clock,
  logger,
  emailSender,
  billing,
  storage,
  webOrigin,
  timer = new SystemTimer(),
  idlePollMs
}: JobsDeps): Jobs {
  const ids = new UuidGenerator()
  const store = new KyselyJobs(db, ids, clock)
  const registry = new JobRegistry()
  const worker = new JobWorker({ store, registry, clock, timer, logger, idlePollMs })
  const waking = (queue: JobQueue) => new WakingJobQueue(queue, () => worker.nudge())
  const bind = (transaction: Kysely<unknown>) => waking(new KyselyJobs(transaction, ids, clock))

  registerHealthJobs(registry, { clock, logger })
  registerStorageJobs(registry, { storage, logger })
  registerIdentityJobs(registry, { emailSender })
  customersEmails.register(registry, emailSender)
  billingEmails.register(registry, emailSender)
  dataExportEmails.register(registry, emailSender)
  registerDataExportJobs(registry, {
    unitOfWork: kyselyDataExportUnitOfWork(db, bind),
    directory: new KyselyOrganizationDirectory(db),
    clock,
    webOrigin
  })
  registerBillingJobs(registry, {
    unitOfWork: kyselyBillingUnitOfWork(db, bind),
    directory: new KyselyBillingDirectory(db),
    provider: billing,
    clock,
    ids,
    logger,
    owners: new KyselyOrganizationOwners(db),
    webOrigin
  })

  return {
    queue: waking(store),
    bind,
    worker
  }
}
