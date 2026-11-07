import { CreateCustomerService } from '../../commands/create-customer/create-customer.service'
import { CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { GetCustomerService } from './get-customer.service'

describe('GetCustomerService', () => {
  const setup = async () => {
    const { repository, clock, ids } = testCustomers()
    await new CreateCustomerService(repository, clock, ids).execute('org-1', { name: 'Ada' })
    return new GetCustomerService(repository)
  }

  it('answers the customer', async () => {
    expect((await (await setup()).execute('org-1', 'id-1')).name).toBe('Ada')
  })

  it('does not find a customer of another organization, nor one that is not there', async () => {
    const service = await setup()

    await expect(service.execute('org-2', 'id-1')).rejects.toThrow(CustomerNotFoundException)
    await expect(service.execute('org-1', 'nope')).rejects.toThrow(CustomerNotFoundException)
  })
})
