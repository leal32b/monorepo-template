import { type Kysely, sql } from 'kysely'
import type { ExportTable } from '../export-table'
import type { TenantRecords } from '../tenant-records.port'
import { tenantTables } from './export-tables'
import { cellOf, headerOf } from './export-values'

/**
 * The tenant tables of `tenantTables`, on a unit of work's transaction (ADR 0074): row-level security returns
 * the organization's rows alone (ADR 0055), and the `where` says it again. One table after another, on the
 * transaction's one connection.
 */
export class KyselyTenantRecords implements TenantRecords {
  readonly #db: Kysely<unknown>

  constructor(transaction: Kysely<unknown>) {
    this.#db = transaction
  }

  async tables(organizationId: string): Promise<ExportTable[]> {
    const tables: ExportTable[] = []
    for (const spec of tenantTables) {
      const columns = sql.join(spec.columns.map((column) => sql.ref(column)))
      const { rows } = await sql<Record<string, unknown>>`
        select ${columns} from ${sql.table(spec.table)}
        where ${sql.ref(spec.organizationColumn)} = ${organizationId}
        order by ${sql.ref(spec.orderBy)}, ${sql.ref(spec.columns[0])}
      `.execute(this.#db)
      tables.push({
        name: spec.file,
        columns: spec.columns.map(headerOf),
        rows: rows.map((row) => spec.columns.map((column) => cellOf(row[column])))
      })
    }
    return tables
  }
}
