import { createApp } from '#app/create-app'
import { createEmailSender } from '#app/create-email-sender'
import { createJobs } from '#app/create-jobs'
import { createShutdown } from '#app/shutdown'
import { type ApiEnv, EnvError, loadEnv } from '#config/env'
import { SystemClock } from '#libs/adapters/system-clock'
import { createDatabase, createPool } from '#libs/database/database'
import { createLogger } from '#libs/logging/create-logger'
import { enqueueQueueCheck } from '#modules/health/jobs/queue-check'

let env: ApiEnv
try {
  env = loadEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = createLogger({ level: env.logLevel, service: 'api', release: env.release })
const db = createDatabase(createPool(env.databaseUrl, logger))
const clock = new SystemClock()
// Background work (ADR 0056): this process runs the jobs unless a worker of its own does.
const jobs = createJobs({ db, clock, logger, idlePollMs: env.jobs.idlePollMs })
const server = createApp({
  clock,
  logger,
  serviceName: 'api',
  release: env.release,
  webOrigin: env.webOrigin,
  corsOrigins: env.corsOrigins,
  proxySecret: env.proxySecret,
  db,
  emailSender: createEmailSender(env.email, logger),
  authSecret: env.authSecret,
  google: env.google
})
const shutdown = createShutdown({
  server,
  logger,
  timeoutMs: 10_000,
  // The worker ends its job in hand before the pool it uses closes.
  release: () => jobs.worker.stop().then(() => db.destroy())
})

server.on('error', (error) => {
  logger.fatal({ err: error }, 'API cannot listen')
  process.exit(1)
})
server.listen(env.port, env.host, () => {
  logger.info({ url: `http://${env.host}:${env.port}` }, 'API listening')
  if (env.jobs.worker) jobs.worker.start()
  // Proof in the log, at every start, that this environment's queue works: `job queue working`.
  enqueueQueueCheck(jobs.queue, clock, env.release).catch((err: unknown) => {
    logger.warn({ err }, 'queue check not enqueued')
  })
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    // Stop taking jobs at once, while requests in flight finish.
    void jobs.worker.stop()
    void shutdown(signal).then(() => process.exit(0))
  })
}

// A bug if reached: log it, drain what is in flight and exit with an error status.
const crash = (kind: string) => (error: unknown) => {
  logger.fatal({ err: error }, kind)
  void shutdown(kind).finally(() => process.exit(1))
}
process.on('unhandledRejection', crash('unhandled rejection'))
process.on('uncaughtException', crash('uncaught exception'))
