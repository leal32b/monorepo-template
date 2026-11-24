import type { Kysely } from 'kysely'
import type { ExportRepository } from '../export-repository.port'
import type { ExportRecord } from '../organization-export'

/** The table of `migrations/0016_organization_export.sql`, its file moved to the store by `0018` (ADR 0076). */
type ExportRow = {
  organization_id: string
  id: string
  requested_by: string
  requested_at: Date
  ready_at: Date | null
  expires_at: Date | null
  size: number | null
}

const recordOf = (row: ExportRow): ExportRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  requestedBy: row.requested_by,
  requestedAt: row.requested_at,
  readyAt: row.ready_at,
  expiresAt: row.expires_at,
  size: row.size
})

/** The organization's last export (ADR 0074), on a unit of work's transaction, never on the pool (ADR 0055). */
export class KyselyExportRepository implements ExportRepository {
  readonly #db: Kysely<{ organization_export: ExportRow }>

  constructor(transaction: Kysely<unknown>) {
    this.#db = transaction.withTables<{ organization_export: ExportRow }>()
  }

  async find(organizationId: string): Promise<ExportRecord | null> {
    const row = await this.#db
      .selectFrom('organization_export')
      .select(['organization_id', 'id', 'requested_by', 'requested_at', 'ready_at', 'expires_at', 'size'])
      .where('organization_id', '=', organizationId)
      .executeTakeFirst()
    return row === undefined ? null : recordOf(row)
  }

  async replace(record: ExportRecord): Promise<void> {
    const row = {
      id: record.id,
      requested_by: record.requestedBy,
      requested_at: record.requestedAt,
      ready_at: null,
      expires_at: null,
      size: null
    }
    await this.#db
      .insertInto('organization_export')
      .values({ organization_id: record.organizationId, ...row })
      .onConflict((conflict) => conflict.column('organization_id').doUpdateSet(row))
      .execute()
  }

  async complete(record: ExportRecord): Promise<boolean> {
    const result = await this.#db
      .updateTable('organization_export')
      .set({ ready_at: record.readyAt, expires_at: record.expiresAt, size: record.size })
      .where('organization_id', '=', record.organizationId)
      .where('id', '=', record.id)
      .where('ready_at', 'is', null)
      .executeTakeFirst()
    return result.numUpdatedRows > 0n
  }
}
