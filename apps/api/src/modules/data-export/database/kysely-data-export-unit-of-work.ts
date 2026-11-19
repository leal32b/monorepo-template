import type { Kysely } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { DataExportUnitOfWork } from '../data-export-unit-of-work.port'
import { KyselyExportRepository } from './kysely-export-repository'
import { KyselyTenantRecords } from './kysely-tenant-records'

/** The module's adapters bound to one Postgres transaction per `run` (ADR 0052, ADR 0055). */
export function kyselyDataExportUnitOfWork(
  db: Kysely<unknown>,
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
): DataExportUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({
    exports: new KyselyExportRepository(transaction),
    records: new KyselyTenantRecords(transaction),
    audit: new KyselyAuditTrail(transaction),
    jobs: jobsOn(transaction)
  }))
}
