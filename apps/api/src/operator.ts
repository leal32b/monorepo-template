import { parseArgs } from 'node:util'
import { EnvError, loadDatabaseEnv } from '#config/env'
import { SystemClock } from '#libs/adapters/system-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { createLogger } from '#libs/logging/create-logger'
import { kyselyBackOfficeUnitOfWork } from '#modules/back-office/database/kysely-back-office-unit-of-work'
import { type GrantRefusal, OperatorGrants } from '#modules/back-office/database/operator-grants'

/**
 * Who is an operator (ADR 0077), run by whoever holds `DATABASE_URL`: `pnpm --filter @repo/api operator …`, or
 * `node dist/operator.js …` in the built image. Never reachable from the product.
 *
 *   operator grant <email> --by <who>
 *   operator revoke <email> --by <who>
 *   operator list
 */
const usage = 'Usage: operator grant <email> --by <who> | operator revoke <email> --by <who> | operator list'

const refusals: Record<GrantRefusal, string> = {
  'no-account': 'No account has this email. The person signs up first.',
  'email-not-confirmed': 'The account has not confirmed its email yet.',
  'two-factor-off': 'The account has no two-step verification. The person turns it on in Security first.',
  'other-sign-in': 'The account also signs in with Google, which asks for no code. The person unlinks it first.',
  'already-operator': 'The account is an operator already.'
}

const { positionals, values } = parseArgs({ allowPositionals: true, options: { by: { type: 'string' } } })
const [command, email] = positionals
const by = values.by?.trim()
if (!(command === 'list' || ((command === 'grant' || command === 'revoke') && email && by))) {
  console.error(usage)
  process.exit(2)
}

let env: ReturnType<typeof loadDatabaseEnv>
try {
  env = loadDatabaseEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = createLogger({ level: env.logLevel, service: 'operator', release: env.release })
const db = createDatabase(createPool(env.databaseUrl, logger))
const clock = new SystemClock()
const ids = new UuidGenerator()
const grants = new OperatorGrants(db, {
  unitOfWork: kyselyBackOfficeUnitOfWork(db, (transaction) => new KyselyJobs(transaction, ids, clock)),
  ids,
  clock
})

try {
  if (command === 'list') {
    for (const record of await grants.list()) {
      const revoked =
        record.revokedAt === null ? 'active' : `revoked ${record.revokedAt.toISOString()} by ${record.revokedBy}`
      console.log(`${record.email}\tgranted ${record.grantedAt.toISOString()} by ${record.grantedBy}\t${revoked}`)
    }
  } else if (command === 'grant') {
    const outcome = await grants.grant(email as string, by as string)
    if (outcome.granted) {
      logger.info({ by }, 'operator granted')
      console.log(`${email} is an operator. They sign in again, with their code, to open /admin.`)
    } else {
      console.error(refusals[outcome.refusal])
      process.exitCode = 1
    }
  } else if (await grants.revoke(email as string, by as string)) {
    logger.info({ by }, 'operator revoked')
    console.log(`${email} is no longer an operator.`)
  } else {
    console.error('No active operator has this email.')
    process.exitCode = 1
  }
} catch (error) {
  logger.fatal({ err: error }, 'operator command failed')
  process.exitCode = 1
} finally {
  await db.destroy()
}
