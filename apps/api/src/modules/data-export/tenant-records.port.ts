import type { ExportTable } from './export-table'

/**
 * The organization's rows in the tenant tables (ADR 0074), read in the module's unit of work, so row-level
 * security returns that organization's alone (ADR 0055).
 */
export interface TenantRecords {
  tables(organizationId: string): Promise<ExportTable[]>
}
