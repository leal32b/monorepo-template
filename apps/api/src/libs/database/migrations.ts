import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Kysely, sql } from 'kysely'

/** `NNNN_snake_case.sql`: the number orders the migrations, the name says what changes. */
const MIGRATION_FILE = /^(\d{4})_[a-z0-9_]+\.sql$/

/** Advisory lock key: two instances booting at once take turns instead of migrating together. */
const LOCK = 'schema_migration'

/**
 * Migration ids (file names without `.sql`) found in `dir`, in order. Hidden files are skipped;
 * any other file, or a number used twice, is an error: the order must never depend on how two
 * names happen to sort (ADR 0013).
 */
export function discoverMigrations(dir: string): string[] {
  const files = readdirSync(dir)
    .filter((file) => !file.startsWith('.'))
    .sort()
  const seen = new Map<string, string>()
  for (const file of files) {
    const number = MIGRATION_FILE.exec(file)?.[1]
    if (number === undefined) throw new Error(`Unexpected file in the migrations folder: ${file}`)
    const other = seen.get(number)
    if (other !== undefined) throw new Error(`Migrations ${other} and ${file} share the number ${number}`)
    seen.set(number, file)
  }
  return files.map((file) => file.slice(0, -'.sql'.length))
}

/**
 * Applies the migrations of `dir` that are not applied yet and returns their ids. Each runs in its
 * own transaction together with its `schema_migration` row, so a failure leaves it pending. The
 * whole run holds a session advisory lock on one pinned connection, released even on failure
 * (ADR 0013).
 */
export async function runMigrations<DB>(db: Kysely<DB>, dir: string): Promise<string[]> {
  const migrations = discoverMigrations(dir)
  return db.connection().execute(async (conn) => {
    await sql`select pg_advisory_lock(hashtext(${LOCK}))`.execute(conn)
    try {
      await sql`
        create table if not exists schema_migration (
          id text primary key,
          applied_at timestamptz not null default now()
        )
      `.execute(conn)
      const { rows } = await sql<{ id: string }>`select id from schema_migration`.execute(conn)
      const applied = new Set(rows.map((row) => row.id))
      const pending = migrations.filter((id) => !applied.has(id))
      for (const id of pending) {
        const text = readFileSync(join(dir, `${id}.sql`), 'utf8')
        await conn.transaction().execute(async (trx) => {
          await sql.raw(text).execute(trx)
          await sql`insert into schema_migration (id) values (${id})`.execute(trx)
        })
      }
      return pending
    } finally {
      await sql`select pg_advisory_unlock(hashtext(${LOCK}))`.execute(conn)
    }
  })
}
