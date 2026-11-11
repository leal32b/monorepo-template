import type { Kysely } from 'kysely'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { KyselyCustomerChangeLog } from './kysely-customer-change-log'
import { KyselyCustomerRepository } from './kysely-customer-repository'

/** The module's adapters bound to one Postgres transaction per `run` (ADR 0052). */
export function kyselyCustomersUnitOfWork(db: Kysely<unknown>): CustomersUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({
    customers: new KyselyCustomerRepository(transaction),
    changes: new KyselyCustomerChangeLog(transaction)
  }))
}
