import type { Kysely } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { JobQueue } from '#libs/ports/job-queue.port'
import type { BillingUnitOfWork } from '../billing-unit-of-work.port'
import { KyselySubscriptionRepository } from './kysely-subscription-repository'

/**
 * The module's adapters bound to one Postgres transaction per `run` (ADR 0052), the only place that
 * builds them outside tests: a tenant adapter on the pool would run outside row-level security (ADR 0055).
 */
export function kyselyBillingUnitOfWork(
  db: Kysely<unknown>,
  jobsOn: (transaction: Kysely<unknown>) => JobQueue
): BillingUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({
    subscriptions: new KyselySubscriptionRepository(transaction),
    audit: new KyselyAuditTrail(transaction),
    jobs: jobsOn(transaction)
  }))
}
