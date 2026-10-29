import pino from 'pino'
import { createApp } from '#app/create-app'
import { createEmailSender } from '#app/create-email-sender'
import { createShutdown } from '#app/shutdown'
import { type ApiEnv, EnvError, loadEnv } from '#config/env'
import { SystemClock } from '#libs/adapters/system-clock'
import { createDatabase, createPool } from '#libs/database/database'

let env: ApiEnv
try {
  env = loadEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = pino({ level: env.logLevel })
const db = createDatabase(createPool(env.databaseUrl, logger))
const server = createApp({
  clock: new SystemClock(),
  logger,
  serviceName: 'api',
  webOrigin: env.webOrigin,
  corsOrigins: env.corsOrigins,
  proxySecret: env.proxySecret,
  db,
  emailSender: createEmailSender(env.email, logger),
  authSecret: env.authSecret
})
const shutdown = createShutdown({ server, logger, timeoutMs: 10_000, release: () => db.destroy() })

server.on('error', (error) => {
  logger.fatal({ err: error }, 'API cannot listen')
  process.exit(1)
})
server.listen(env.port, env.host, () => {
  logger.info({ url: `http://${env.host}:${env.port}` }, 'API listening')
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
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
