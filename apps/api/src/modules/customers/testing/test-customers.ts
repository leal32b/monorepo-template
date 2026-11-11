import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { InMemoryCustomerChangeLog } from './in-memory-customer-change-log'
import { InMemoryCustomerRepository } from './in-memory-customer-repository'

/**
 * What a use-case test needs: an empty repository and change log, a unit of work over both, a clock
 * stopped on a day, and ids `id-1`, `id-2`...
 */
export function testCustomers() {
  let count = 0
  const ids: IdGenerator = { generate: () => `id-${++count}` }
  const repository = new InMemoryCustomerRepository()
  const changes = new InMemoryCustomerChangeLog()
  const unitOfWork: CustomersUnitOfWork = new InMemoryUnitOfWork({ customers: repository, changes })
  return { repository, changes, unitOfWork, clock: new FixedClock(new Date('2026-11-07T10:00:00.000Z')), ids }
}
