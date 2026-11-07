import { CustomerEmailTakenException, CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { UpdateCustomerService } from './update-customer.service'

describe('UpdateCustomerService', () => {
  const setup = async () => {
    const { repository, clock, ids } = testCustomers()
    const create = new CreateCustomerService(repository, clock, ids)
    await create.execute('org-1', { name: 'Ada', email: 'ada@example.com' })
    await create.execute('org-1', { name: 'Bob' })
    return { service: new UpdateCustomerService(repository) }
  }

  it('replaces the details and keeps the rest, so a field left out is cleared', async () => {
    const { service } = await setup()

    const updated = await service.execute('org-1', 'id-1', { name: 'Ada King', phone: '123' })

    expect(updated).toMatchObject({
      id: 'id-1',
      name: 'Ada King',
      email: null,
      phone: '123',
      createdAt: '2026-11-07T10:00:00.000Z'
    })
  })

  it('does not find a customer of another organization, nor one that is not there', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', { name: 'X' })).rejects.toThrow(CustomerNotFoundException)
    await expect(service.execute('org-1', 'nope', { name: 'X' })).rejects.toThrow(CustomerNotFoundException)
  })

  it('refuses an email another customer has', async () => {
    const { service } = await setup()

    await expect(service.execute('org-1', 'id-2', { name: 'Bob', email: 'ada@example.com' })).rejects.toThrow(
      CustomerEmailTakenException
    )
  })
})
