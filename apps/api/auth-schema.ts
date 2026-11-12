/**
 * Prints the SQL that brings the `auth` schema in line with Better Auth's configuration (ADR 0020):
 * the body of the next migration. It applies our migrations to an empty PGlite, then asks Better
 * Auth's generator what is missing. Run with `pnpm --filter @repo/api auth:schema`.
 */
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { getMigrations } from 'better-auth/db/migration'
import pino from 'pino'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { SystemClock } from '#libs/adapters/system-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { createAuth } from '#modules/identity/infrastructure/auth'

const logger = pino({ level: 'silent' })
const pglite = await PGlite.create()
const server = new PGLiteSocketServer({ db: pglite, host: '127.0.0.1', port: 0 })
await server.start()
const db = createDatabase(createPool(`postgres://postgres:postgres@${server.getServerConn()}/postgres`, logger))

try {
  await runMigrations(db, fileURLToPath(new URL('migrations/', import.meta.url)))
  const auth = createAuth({
    db,
    logger,
    jobs: new InMemoryJobs(new UuidGenerator(), new SystemClock()), // no email is sent here
    webOrigin: 'http://localhost:5173',
    secret: 'schema-only-secret-0123456789abcdef',
    google: undefined // Google adds no tables or columns
  })
  const { toBeCreated, toBeAdded, toBeAddedIndexes, compileMigrations } = await getMigrations(auth.options)
  const upToDate = toBeCreated.length + toBeAdded.length + toBeAddedIndexes.length === 0
  console.log(upToDate ? '-- The auth schema is up to date.' : await compileMigrations())
} finally {
  await db.destroy()
  await server.stop()
  await pglite.close()
}
