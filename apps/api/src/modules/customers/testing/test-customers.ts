import { FixedClock } from '#libs/adapters/fixed-clock'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { InMemoryCustomerRepository } from './in-memory-customer-repository'

/** What a use-case test needs: an empty repository, a clock stopped on a day, and ids `id-1`, `id-2`... */
export function testCustomers() {
  let count = 0
  const ids: IdGenerator = { generate: () => `id-${++count}` }
  return {
    repository: new InMemoryCustomerRepository(),
    clock: new FixedClock(new Date('2026-11-07T10:00:00.000Z')),
    ids
  }
}
