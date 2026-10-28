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
 * own transaction together with its `schema_migration` row, so a failure leaves it pending. That
 * transaction first takes a transaction-level advisory lock and reads what is applied, so instances
 * booting at once take turns. Nothing runs outside a transaction, so a pooler in transaction mode
 * (PgBouncer) keeps every step on one server connection (ADR 0018).
 */
export async function runMigrations<DB>(db: Kysely<DB>, dir: string): Promise<string[]> {
  const migrations = discoverMigrations(dir)
  const applied: string[] = []
  let next: string | undefined
  do {
    next = await db.transaction().execute(async (trx) => {
      await sql`select pg_advisory_xact_lock(hashtext(${LOCK}))`.execute(trx)
      await sql`
        create table if not exists schema_migration (
          id text primary key,
          applied_at timestamptz not null default now()
        )
      `.execute(trx)
      const { rows } = await sql<{ id: string }>`select id from schema_migration`.execute(trx)
      const done = new Set(rows.map((row) => row.id))
      const id = migrations.find((migration) => !done.has(migration))
      if (id === undefined) return undefined
      await sql.raw(readFileSync(join(dir, `${id}.sql`), 'utf8')).execute(trx)
      await sql`insert into schema_migration (id) values (${id})`.execute(trx)
      return id
    })
    if (next !== undefined) applied.push(next)
  } while (next !== undefined)
  return applied
}
