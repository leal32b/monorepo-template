import type { CustomerChangeLog } from '../customer-change-log.port'
import type { CustomerRepository } from '../customer-repository.port'
import type { CustomersUnitOfWork } from '../customers-unit-of-work.port'
import { aChange } from './customer-change-log.contract'
import { aCustomer } from './customer-repository.contract'

export type CustomersUnderTest = {
  unitOfWork: CustomersUnitOfWork
  /** The same stores read outside any unit of work, to see what was kept. */
  customers: CustomerRepository
  changes: CustomerChangeLog
}

/**
 * What every `CustomersUnitOfWork` must do (ADR 0052), run against the in-memory fake and the database
 * adapter alike: the writes of one `run` are kept together or not at all.
 */
export function describeCustomersUnitOfWork(label: string, make: () => Promise<CustomersUnderTest>): void {
  describe(`${label} as a CustomersUnitOfWork`, () => {
    let under: CustomersUnderTest

    beforeEach(async () => {
      under = await make()
      await under.customers.insert(aCustomer('c1'))
    })

    it('keeps both writes when the work ends, and returns what it returns', async () => {
      const result = await under.unitOfWork.run('org-1', async ({ customers, changes }) => {
        await customers.remove(aCustomer('c1'))
        await changes.append(aChange('ch1'))
        return 'done'
      })

      expect(result).toBe('done')
      expect(await under.customers.findById('org-1', 'c1')).toBeNull()
      expect(await under.changes.list('org-1')).toEqual([aChange('ch1')])
    })

    it('rolls the first write back when the second fails', async () => {
      await under.changes.append(aChange('ch1', { customerId: 'another' }))

      const work = under.unitOfWork.run('org-1', async ({ customers, changes }) => {
        await customers.remove(aCustomer('c1'))
        await changes.append(aChange('ch1'))
      })

      await expect(work).rejects.toThrow()
      expect(await under.customers.findById('org-1', 'c1')).toEqual(aCustomer('c1'))
      expect(await under.changes.list('org-1')).toEqual([aChange('ch1', { customerId: 'another' })])
    })

    it('rolls both writes back when the work throws after them', async () => {
      const work = under.unitOfWork.run('org-1', async ({ customers, changes }) => {
        await customers.remove(aCustomer('c1'))
        await changes.append(aChange('ch1'))
        throw new Error('changed my mind')
      })

      await expect(work).rejects.toThrow('changed my mind')
      expect(await under.customers.findById('org-1', 'c1')).toEqual(aCustomer('c1'))
      expect(await under.changes.list('org-1')).toEqual([])
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
