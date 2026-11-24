import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'
import type { LogoRepository } from './logo-repository.port'

/** What one transaction of the module offers (ADR 0052). */
export type OrganizationLogoRepositories = {
  logos: LogoRepository
  /** A change records its entry here, in the same transaction (ADR 0061). */
  audit: AuditTrail
  /** The files a change frees are deleted by a job enqueued with it (ADR 0076). */
  jobs: JobQueue
}

/** The module's database work for one organization (ADR 0052, ADR 0055). */
export type OrganizationLogoUnitOfWork = UnitOfWork<OrganizationLogoRepositories>
