import type { UnitOfWork } from '#libs/ports/unit-of-work.port'
import type { CustomerChangeLog } from './customer-change-log.port'
import type { CustomerRepository } from './customer-repository.port'

/** What one transaction of the module offers; a new repository joins a transaction by being added here. */
export type CustomerRepositories = {
  customers: CustomerRepository
  changes: CustomerChangeLog
}

/**
 * The module's writes that commit or roll back together (ADR 0052). A use case with more than one
 * write takes this, and reads, decides and writes inside `run`; one with a single write keeps taking
 * the repository.
 */
export type CustomersUnitOfWork = UnitOfWork<CustomerRepositories>
