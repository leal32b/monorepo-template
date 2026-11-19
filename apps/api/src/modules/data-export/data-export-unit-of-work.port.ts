import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'
import type { ExportRepository } from './export-repository.port'
import type { TenantRecords } from './tenant-records.port'

/** What one transaction of the module offers (ADR 0052). */
export type DataExportRepositories = {
  exports: ExportRepository
  /** Every tenant table the export holds, confined to the organization (ADR 0055). */
  records: TenantRecords
  /** The request records its entry here, in the same transaction (ADR 0061). */
  audit: AuditTrail
  /** The build is enqueued with the request, and the email with the file (ADR 0052). */
  jobs: JobQueue
}

/** The module's database work for one organization (ADR 0052, ADR 0055). */
export type DataExportUnitOfWork = UnitOfWork<DataExportRepositories>
