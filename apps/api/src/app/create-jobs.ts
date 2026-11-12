import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { SystemTimer } from '#libs/adapters/system-timer'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { WakingJobQueue } from '#libs/jobs/waking-job-queue'
import type { Clock } from '#libs/ports/clock.port'
import type { EmailSender } from '#libs/ports/email-sender.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { Timer } from '#libs/ports/timer.port'
import { registerHealthJobs } from '#modules/health/jobs/queue-check'
import { registerIdentityJobs } from '#modules/identity/jobs/send-email'

export type JobsDeps = {
  db: Kysely<unknown>
  clock: Clock
  logger: Logger
  /** Where identity's emails go (ADR 0021): the process that runs the jobs sends them (ADR 0057). */
  emailSender: EmailSender
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
export function createJobs({ db, clock, logger, emailSender, timer = new SystemTimer(), idlePollMs }: JobsDeps): Jobs {
  const ids = new UuidGenerator()
  const store = new KyselyJobs(db, ids, clock)
  const registry = new JobRegistry()
  const worker = new JobWorker({ store, registry, clock, timer, logger, idlePollMs })
  const waking = (queue: JobQueue) => new WakingJobQueue(queue, () => worker.nudge())

  registerHealthJobs(registry, { clock, logger })
  registerIdentityJobs(registry, { emailSender })

  return {
    queue: waking(store),
    bind: (transaction) => waking(new KyselyJobs(transaction, ids, clock)),
    worker
  }
}
