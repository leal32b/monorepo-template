import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { InMemoryCustomerRepository } from './in-memory-customer-repository'

/** The member the use-case tests act as. */
export const byAda: AuditActor = { kind: 'member', id: 'user-ada' }

/**
 * What a use-case test needs: an empty repository and audit trail, a unit of work over both, a clock
 * stopped on a day, and ids `id-1`, `id-2`...
 */
export function testCustomers() {
  let count = 0
  const ids: IdGenerator = { generate: () => `id-${++count}` }
  const repository = new InMemoryCustomerRepository()
  const audit = new InMemoryAuditTrail()
  const unitOfWork: CustomersUnitOfWork = new InMemoryUnitOfWork({ customers: repository, audit })
  return { repository, audit, unitOfWork, clock: new FixedClock(new Date('2026-11-07T10:00:00.000Z')), ids }
}
