import pino from 'pino'
import { createApp } from '#app/create-app'
import { loadEnv } from '#config/env'
import { FileEmailSender } from '#libs/adapters/file-email-sender'
import { SystemClock } from '#libs/adapters/system-clock'
import { createDatabase, createPool } from '#libs/database/database'

/**
 * The API as the end-to-end suite runs it (ADR 0045): the production wiring, except that emails go
 * to a file the tests read (E2E_OUTBOX) and the breached-password check answers offline, so the
 * suite needs no provider and no internet. Never bundled, never deployed.
 */
const outbox = process.env.E2E_OUTBOX
if (!outbox) throw new Error('E2E_OUTBOX names the file the emails go to')

// Have I Been Pwned's range API: an empty answer means no breached password has this prefix.
const realFetch = globalThis.fetch
globalThis.fetch = (input, init) =>
  String(input instanceof Request ? input.url : input).startsWith('https://api.pwnedpasswords.com/range/')
    ? Promise.resolve(new Response(''))
    : realFetch(input, init)

const env = loadEnv(process.env)
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
  emailSender: new FileEmailSender(outbox),
  authSecret: env.authSecret,
  google: env.google
})

server.listen(env.port, env.host, () => {
  logger.info({ url: `http://${env.host}:${env.port}` }, 'API listening for the end-to-end suite')
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void db.destroy().then(() => process.exit(0))
  })
}
