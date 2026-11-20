import type { Kysely } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { OrganizationLogoUnitOfWork } from '../organization-logo-unit-of-work.port'
import { KyselyLogoRepository } from './kysely-logo-repository'

/** The module's adapters bound to one Postgres transaction per `run` (ADR 0052, ADR 0055). */
export function kyselyOrganizationLogoUnitOfWork(
  db: Kysely<unknown>,
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
): OrganizationLogoUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({
    logos: new KyselyLogoRepository(transaction),
    audit: new KyselyAuditTrail(transaction),
    jobs: jobsOn(transaction)
  }))
}
