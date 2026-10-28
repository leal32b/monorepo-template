import { fileURLToPath } from 'node:url'
import pino from 'pino'
import { type ApiEnv, EnvError, loadEnv } from '#config/env'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'

let env: ApiEnv
try {
  env = loadEnv(process.env)
} catch (error) {
  if (!(error instanceof EnvError)) throw error
  console.error(error.message)
  process.exit(1)
}

const logger = pino({ level: env.logLevel })
// `src/migrate.ts` and the bundled `dist/migrate.js` both sit one level below `apps/api/`.
const dir = fileURLToPath(new URL('../migrations/', import.meta.url))
const db = createDatabase(createPool(env.databaseUrl, logger))

try {
  const applied = await runMigrations(db, dir)
  logger.info({ applied }, applied.length > 0 ? 'migrations applied' : 'database up to date')
} catch (error) {
  logger.fatal({ err: error }, 'migration failed')
  process.exitCode = 1
} finally {
  await db.destroy()
}
