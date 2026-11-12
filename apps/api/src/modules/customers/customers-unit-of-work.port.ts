import type { UnitOfWork } from '#libs/ports/unit-of-work.port'
import type { CustomerChangeLog } from './customer-change-log.port'
import type { CustomerRepository } from './customer-repository.port'

/** What one transaction of the module offers; a new repository joins a transaction by being added here. */
export type CustomerRepositories = {
  customers: CustomerRepository
  changes: CustomerChangeLog
}

/**
 * The module's database work for one organization (ADR 0052, ADR 0055). Every use case takes this and
 * reads, decides and writes inside `run(organizationId, …)`: what it writes commits or rolls back
 * together, and Postgres confines it to that organization.
 */
export type CustomersUnitOfWork = UnitOfWork<CustomerRepositories>
