import { EnvError, loadDatabaseEnv } from '#config/env'
import { SystemClock } from '#libs/adapters/system-clock'
import { createDatabase, createPool } from '#libs/database/database'
import { purgeAuditEntries } from '#libs/database/kysely-audit-trail'
import { purgeFinishedJobs } from '#libs/database/kysely-jobs'
import { purgeRateLimits } from '#libs/database/kysely-rate-limiter'
import { createLogger } from '#libs/logging/create-logger'
import { purgeExpiredIdentityRows } from '#modules/identity/infrastructure/purge-expired'

/**
 * Deletes the rows past their use (ADR 0050), once, and exits: run by a schedule (the `Purge`
 * workflow, or a host's cron with `node dist/purge.js`). It needs only `DATABASE_URL`. A product
 * module whose rows expire adds its purge here, beside identity's.
 */
let env: ReturnType<typeof loadDatabaseEnv>
try {
  env = loadDatabaseEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = createLogger({ level: env.logLevel, service: 'purge', release: env.release })
const db = createDatabase(createPool(env.databaseUrl, logger))

try {
  const now = new SystemClock().now()
  const identity = await purgeExpiredIdentityRows(db, now)
  // Finished jobs past their keep (ADR 0056): done after 7 days, failed after 30.
  const jobs = await purgeFinishedJobs(db, now)
  // Counters of our own rate limiter (ADR 0059), a day after their window started.
  const rateLimits = await purgeRateLimits(db, now)
  // Audit entries past their retention (ADR 0061): a year.
  const audit = await purgeAuditEntries(db, now)
  logger.info({ removed: { identity, jobs, rateLimits, audit } }, 'expired rows purged')
} catch (error) {
  logger.fatal({ err: error }, 'purge failed')
  process.exitCode = 1
} finally {
  await db.destroy()
}
