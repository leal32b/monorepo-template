import { createJobs } from '#app/create-jobs'
import { type ApiEnv, EnvError, loadEnv } from '#config/env'
import { SystemClock } from '#libs/adapters/system-clock'
import { createDatabase, createPool } from '#libs/database/database'
import { createLogger } from '#libs/logging/create-logger'

/**
 * The jobs in a process of their own (ADR 0056): the same image and environment as the API, which
 * then runs with `JOB_WORKER=off`. It serves no HTTP. An enqueue in the API cannot wake it, so give
 * it a short `JOB_IDLE_POLL_SECONDS`. Run it with `node dist/worker.js`.
 */
let env: ApiEnv
try {
  env = loadEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = createLogger({ level: env.logLevel, service: 'worker', release: env.release })
const db = createDatabase(createPool(env.databaseUrl, logger))
const jobs = createJobs({ db, clock: new SystemClock(), logger, idlePollMs: env.jobs.idlePollMs })

jobs.worker.start()
logger.info({ idlePollMs: env.jobs.idlePollMs }, 'worker running')

const stop = (reason: string) =>
  jobs.worker
    .stop()
    .then(() => db.destroy())
    .catch((err: unknown) => logger.error({ err, reason }, 'releasing resources failed'))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info({ reason: signal }, 'shutting down')
    void stop(signal).then(() => process.exit(0))
  })
}

// A bug if reached: log it, let the job in hand end and exit with an error status.
const crash = (kind: string) => (error: unknown) => {
  logger.fatal({ err: error }, kind)
  void stop(kind).finally(() => process.exit(1))
}
process.on('unhandledRejection', crash('unhandled rejection'))
process.on('uncaughtException', crash('uncaught exception'))
