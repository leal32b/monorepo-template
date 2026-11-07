import { CustomerAlreadyArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { ArchiveCustomerService } from './archive-customer.service'

describe('ArchiveCustomerService', () => {
  const setup = async () => {
    const { repository, clock, ids } = testCustomers()
    await new CreateCustomerService(repository, clock, ids).execute('org-1', { name: 'Ada' })
    return { repository, service: new ArchiveCustomerService(repository, clock) }
  }

  it('archives the customer today and keeps it', async () => {
    const { repository, service } = await setup()

    expect((await service.execute('org-1', 'id-1')).archivedAt).toBe('2026-11-07T10:00:00.000Z')
    expect((await repository.findById('org-1', 'id-1'))?.archivedAt).toEqual(new Date('2026-11-07T10:00:00.000Z'))
  })

  it('refuses to archive twice', async () => {
    const { service } = await setup()
    await service.execute('org-1', 'id-1')

    await expect(service.execute('org-1', 'id-1')).rejects.toThrow(CustomerAlreadyArchivedException)
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1')).rejects.toThrow(CustomerNotFoundException)
  })
})
