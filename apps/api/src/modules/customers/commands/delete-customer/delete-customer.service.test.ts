import { CustomerNotArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { ArchiveCustomerService } from '../archive-customer/archive-customer.service'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { DeleteCustomerService } from './delete-customer.service'

describe('DeleteCustomerService', () => {
  const setup = async () => {
    const { repository, clock, ids } = testCustomers()
    await new CreateCustomerService(repository, clock, ids).execute('org-1', { name: 'Ada' })
    return {
      repository,
      archive: new ArchiveCustomerService(repository, clock),
      service: new DeleteCustomerService(repository)
    }
  }

  it('deletes an archived customer', async () => {
    const { repository, archive, service } = await setup()
    await archive.execute('org-1', 'id-1')

    await service.execute('org-1', 'id-1')

    expect(await repository.findById('org-1', 'id-1')).toBeNull()
  })

  it('keeps an active customer: it is archived first', async () => {
    const { repository, service } = await setup()

    await expect(service.execute('org-1', 'id-1')).rejects.toThrow(CustomerNotArchivedException)
    expect(await repository.findById('org-1', 'id-1')).not.toBeNull()
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1')).rejects.toThrow(CustomerNotFoundException)
  })
})
