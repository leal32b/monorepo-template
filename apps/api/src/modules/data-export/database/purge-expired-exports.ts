import { type Kysely, sql } from 'kysely'

/**
 * Empties the file of every export past its expiry (ADR 0074, ADR 0050), as the tables' owner, and keeps the
 * row, so the page says it expired. One row per organization at most, so one statement does it.
 */
export async function purgeExpiredExports(db: Kysely<unknown>, now: Date): Promise<number> {
  const { numAffectedRows } = await sql`
    update organization_export set file = null where file is not null and expires_at <= ${now}
  `.execute(db)
  return Number(numAffectedRows)
}
