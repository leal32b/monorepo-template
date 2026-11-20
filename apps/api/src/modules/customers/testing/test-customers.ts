import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { FakeOrganizationOwners } from '#modules/identity/testing/fake-organization-owners'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { InMemoryCustomerRepository } from './in-memory-customer-repository'

/** The member the use-case tests act as. */
export const byAda: AuditActor = { kind: 'member', id: 'user-ada' }

/**
 * What a use-case test needs: an empty repository, audit trail and queue, a unit of work over them, a
 * clock stopped on a day, ids `id-1`, `id-2`... (the queue counts its own), and Acme's owner, Ada, who
 * reads in pt-BR in São Paulo.
 */
export function testCustomers() {
  let count = 0
  const ids: IdGenerator = { generate: () => `id-${++count}` }
  let jobCount = 0
  const clock = new FixedClock(new Date('2026-11-07T10:00:00.000Z'))
  const repository = new InMemoryCustomerRepository()
  const audit = new InMemoryAuditTrail()
  const jobs = new InMemoryJobs({ generate: () => `job-${++jobCount}` }, clock)
  const unitOfWork: CustomersUnitOfWork = new InMemoryUnitOfWork({ customers: repository, audit, jobs })
  const owners = new FakeOrganizationOwners({
    'org-1': {
      email: 'ada@example.com',
      locale: 'pt-BR',
      organization: { name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo' }
    }
  })
  return { repository, audit, jobs, unitOfWork, clock, ids, owners, webOrigin: 'https://app.example.com' }
}
