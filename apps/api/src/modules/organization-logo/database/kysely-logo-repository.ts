import type { Kysely } from 'kysely'
import type { LogoRecord } from '../logo'
import type { LogoRepository } from '../logo-repository.port'

/** The table of `migrations/0017_organization_logo.sql`. */
type LogoRow = {
  organization_id: string
  id: string
  type: LogoRecord['type']
  width: number
  height: number
  size: number
  updated_by: string
  updated_at: Date
}

/** The organization's logo (ADR 0076), on a unit of work's transaction, never on the pool (ADR 0055). */
export class KyselyLogoRepository implements LogoRepository {
  readonly #db: Kysely<{ organization_logo: LogoRow }>

  constructor(transaction: Kysely<unknown>) {
    this.#db = transaction.withTables<{ organization_logo: LogoRow }>()
  }

  async find(organizationId: string): Promise<LogoRecord | null> {
    const row = await this.#db
      .selectFrom('organization_logo')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .executeTakeFirst()
    if (row === undefined) return null
    return {
      id: row.id,
      organizationId: row.organization_id,
      type: row.type,
      width: row.width,
      height: row.height,
      size: row.size,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at
    }
  }

  async save(record: LogoRecord): Promise<void> {
    const row = {
      id: record.id,
      type: record.type,
      width: record.width,
      height: record.height,
      size: record.size,
      updated_by: record.updatedBy,
      updated_at: record.updatedAt
    }
    await this.#db
      .insertInto('organization_logo')
      .values({ organization_id: record.organizationId, ...row })
      .onConflict((conflict) => conflict.column('organization_id').doUpdateSet(row))
      .execute()
  }

  async remove(organizationId: string): Promise<void> {
    await this.#db.deleteFrom('organization_logo').where('organization_id', '=', organizationId).execute()
  }
}
