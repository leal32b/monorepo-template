import { CustomerNotArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { ArchiveCustomerService } from '../archive-customer/archive-customer.service'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { RestoreCustomerService } from './restore-customer.service'

describe('RestoreCustomerService', () => {
  const setup = async () => {
    const { repository, clock, ids } = testCustomers()
    await new CreateCustomerService(repository, clock, ids).execute('org-1', { name: 'Ada' })
    return { archive: new ArchiveCustomerService(repository, clock), service: new RestoreCustomerService(repository) }
  }

  it('makes an archived customer active again', async () => {
    const { archive, service } = await setup()
    await archive.execute('org-1', 'id-1')

    expect((await service.execute('org-1', 'id-1')).archivedAt).toBeNull()
  })

  it('refuses to restore an active customer', async () => {
    const { service } = await setup()

    await expect(service.execute('org-1', 'id-1')).rejects.toThrow(CustomerNotArchivedException)
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1')).rejects.toThrow(CustomerNotFoundException)
  })
})
