import { customerListSchema, customerPageSize } from '@repo/contracts'
import { CreateCustomerService } from '../../commands/create-customer/create-customer.service'
import { byAda, testCustomers } from '../../testing/test-customers'
import { ListCustomersService } from './list-customers.service'

describe('ListCustomersService', () => {
  const setup = async (names: string[]) => {
    const { unitOfWork, clock, ids } = testCustomers()
    const create = new CreateCustomerService(unitOfWork, clock, ids)
    for (const name of names) await create.execute('org-1', { name }, byAda)
    return new ListCustomersService(unitOfWork)
  }

  it('answers a page in the shape of the contract, with the total and the page size', async () => {
    const service = await setup(['Bob', 'Ada'])

    const list = await service.execute('org-1', { status: 'active', page: 1 })

    expect(customerListSchema.safeParse(list).success).toBe(true)
    expect(list).toMatchObject({ total: 2, page: 1, pageSize: customerPageSize })
    expect(list.items.map((customer) => customer.name)).toEqual(['Ada', 'Bob'])
  })

  it('passes the search and the status on, and reads the page asked for', async () => {
    const names = Array.from({ length: customerPageSize + 1 }, (_, i) => `Customer ${String(i).padStart(2, '0')}`)
    const service = await setup(names)

    expect((await service.execute('org-1', { status: 'active', page: 2 })).items).toHaveLength(1)
    expect((await service.execute('org-1', { status: 'archived', page: 1 })).total).toBe(0)
    expect((await service.execute('org-1', { status: 'active', page: 1, search: 'customer 07' })).total).toBe(1)
  })
})
