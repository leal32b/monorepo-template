import { type Kysely, sql } from 'kysely'

/** Back to an empty database, before a test runs the migrations: every table the migrations create. */
export async function resetDatabase(db: Kysely<unknown>): Promise<void> {
  await sql
    .raw(
      'drop schema if exists auth cascade; drop table if exists rate_limit; drop table if exists job; drop table if exists audit_entry; drop table if exists customer_change; drop table if exists customer; drop table if exists schema_migration'
    )
    .execute(db)
}
