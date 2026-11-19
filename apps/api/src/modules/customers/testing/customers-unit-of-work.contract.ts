import { anEntry } from '#libs/audit/testing/audit-trail.contract'
import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { CustomerRepository } from '../customer-repository.port'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { customersEmails } from '../emails/customers-emails'
import { aCustomer } from './customer-repository.contract'

export type CustomersUnderTest = {
  unitOfWork: CustomersUnitOfWork
  /** The same stores read outside any unit of work, to see what was kept. */
  customers: CustomerRepository
  audit: AuditTrail
  /** How many jobs were kept, read outside any unit of work. */
  jobsKept: () => Promise<number>
}

const page = { limit: 10 }

/**
 * What every `CustomersUnitOfWork` must do (ADR 0052, ADR 0061), run against the in-memory fake and the
 * database adapter alike: a change, its audit entry and the jobs it enqueues are kept together or not at all.
 */
export function describeCustomersUnitOfWork(label: string, make: () => Promise<CustomersUnderTest>): void {
  describe(`${label} as a CustomersUnitOfWork`, () => {
    let under: CustomersUnderTest

    beforeEach(async () => {
      under = await make()
      await under.customers.insert(aCustomer('c1'))
    })

    it('keeps the change and its entry when the work ends, and returns what it returns', async () => {
      const result = await under.unitOfWork.run('org-1', async ({ customers, audit }) => {
        await customers.remove(aCustomer('c1'))
        await audit.record(anEntry('e1', { action: 'deleted', fields: [] }))
        return 'done'
      })

      expect(result).toBe('done')
      expect(await under.customers.findById('org-1', 'c1')).toBeNull()
      expect(await under.audit.list('org-1', page)).toEqual([anEntry('e1', { action: 'deleted', fields: [] })])
    })

    it('rolls the change back when its entry cannot be recorded', async () => {
      await under.audit.record(anEntry('e1', { resourceId: 'another' }))

      const work = under.unitOfWork.run('org-1', async ({ customers, audit }) => {
        await customers.save(aCustomer('c1', { name: 'Renamed' }))
        await audit.record(anEntry('e1'))
      })

      await expect(work).rejects.toThrow()
      expect(await under.customers.findById('org-1', 'c1')).toEqual(aCustomer('c1'))
      expect(await under.audit.list('org-1', page)).toEqual([anEntry('e1', { resourceId: 'another' })])
    })

    it('rolls both back when the work throws after them', async () => {
      const work = under.unitOfWork.run('org-1', async ({ customers, audit }) => {
        await customers.insert(aCustomer('c2'))
        await audit.record(anEntry('e1', { resourceId: 'c2', action: 'created' }))
        throw new Error('changed my mind')
      })

      await expect(work).rejects.toThrow('changed my mind')
      expect(await under.customers.findById('org-1', 'c2')).toBeNull()
      expect(await under.audit.list('org-1', page)).toEqual([])
    })

    it('keeps a job enqueued in the work with the change, and drops it when the work throws (ADR 0073)', async () => {
      const email = {
        email: 'customerRegistered' as const,
        to: 'ada@example.com',
        locale: 'en' as const,
        url: 'https://app.example.com/acme/customers'
      }

      await under.unitOfWork.run('org-1', ({ jobs }) => jobs.enqueue(customersEmails.job, email))
      const dropped = under.unitOfWork.run('org-1', async ({ jobs }) => {
        await jobs.enqueue(customersEmails.job, email)
        throw new Error('changed my mind')
      })

      await expect(dropped).rejects.toThrow('changed my mind')
      expect(await under.jobsKept()).toBe(1)
    })

    it('reads its own writes inside the work', async () => {
      await under.unitOfWork.run('org-1', async ({ customers }) => {
        await customers.insert(aCustomer('c2'))
        const saved = await customers.save(aCustomer('c2', { name: 'Renamed' }))

        expect(await customers.findById('org-1', 'c2')).toEqual(saved)
      })

      expect(await under.customers.findById('org-1', 'c2')).toMatchObject({ name: 'Renamed', version: 2 })
    })
  })
}
