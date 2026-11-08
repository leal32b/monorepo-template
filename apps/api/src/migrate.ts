import { fileURLToPath } from 'node:url'
import { type ApiEnv, EnvError, loadEnv } from '#config/env'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { createLogger } from '#libs/logging/create-logger'

let env: ApiEnv
try {
  env = loadEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = createLogger({ level: env.logLevel, service: 'migrate', release: env.release })
// `src/migrate.ts` and the bundled `dist/migrate.js` both sit one level below `apps/api/`.
const dir = fileURLToPath(new URL('../migrations/', import.meta.url))
// A migration may rewrite a large table: no deadline per statement here (ADR 0047).
const db = createDatabase(createPool(env.databaseUrl, logger, { queryTimeoutMs: 0 }))

try {
  const applied = await runMigrations(db, dir)
  logger.info({ applied }, applied.length > 0 ? 'migrations applied' : 'database up to date')
} catch (error) {
  logger.fatal({ err: error }, 'migration failed')
  process.exitCode = 1
} finally {
  await db.destroy()
}
