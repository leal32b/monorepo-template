import type { Kysely } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { KyselyCustomerRepository } from './kysely-customer-repository'

/**
 * The module's adapters bound to one Postgres transaction per `run` (ADR 0052), the only place that
 * builds them outside tests: a tenant adapter on the pool would run outside row-level security (ADR 0055).
 */
export function kyselyCustomersUnitOfWork(db: Kysely<unknown>): CustomersUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({
    customers: new KyselyCustomerRepository(transaction),
    audit: new KyselyAuditTrail(transaction)
  }))
}
