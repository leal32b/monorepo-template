import { CustomerNotArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { ArchiveCustomerService } from '../archive-customer/archive-customer.service'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { DeleteCustomerService } from './delete-customer.service'

describe('DeleteCustomerService', () => {
  const setup = async () => {
    const { repository, changes, unitOfWork, clock, ids } = testCustomers()
    const create = new CreateCustomerService(unitOfWork, clock, ids)
    const archive = new ArchiveCustomerService(unitOfWork, clock)
    await create.execute('org-1', { name: 'Ada' })
    return {
      repository,
      changes,
      unitOfWork,
      clock,
      ids,
      create,
      archive,
      service: new DeleteCustomerService(unitOfWork, clock, ids)
    }
  }

  it('deletes an archived customer and records who did it, and when', async () => {
    const { repository, changes, archive, service } = await setup()
    await archive.execute('org-1', 'id-1')

    await service.execute('org-1', 'id-1', 'user-ada')

    expect(await repository.findById('org-1', 'id-1')).toBeNull()
    expect(await changes.list('org-1')).toEqual([
      {
        id: 'id-2',
        organizationId: 'org-1',
        customerId: 'id-1',
        action: 'deleted',
        actorId: 'user-ada',
        at: new Date('2026-11-07T10:00:00.000Z')
      }
    ])
  })

  it('keeps the customer when its record cannot be written (ADR 0052)', async () => {
    const { repository, changes, unitOfWork, clock, create, archive } = await setup()
    await create.execute('org-1', { name: 'Bob' })
    await archive.execute('org-1', 'id-1')
    await archive.execute('org-1', 'id-2')
    const service = new DeleteCustomerService(unitOfWork, clock, { generate: () => 'the-same-id' })
    await service.execute('org-1', 'id-1', 'user-ada')

    await expect(service.execute('org-1', 'id-2', 'user-ada')).rejects.toThrow()

    expect(await repository.findById('org-1', 'id-2')).not.toBeNull()
    expect((await changes.list('org-1')).map((change) => change.customerId)).toEqual(['id-1'])
  })

  it('keeps an active customer, and records nothing: it is archived first', async () => {
    const { repository, changes, service } = await setup()

    await expect(service.execute('org-1', 'id-1', 'user-ada')).rejects.toThrow(CustomerNotArchivedException)
    expect(await repository.findById('org-1', 'id-1')).not.toBeNull()
    expect(await changes.list('org-1')).toEqual([])
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', 'user-ada')).rejects.toThrow(CustomerNotFoundException)
  })
})
