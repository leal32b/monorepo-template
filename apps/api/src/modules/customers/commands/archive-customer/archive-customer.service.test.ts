import { CustomerAlreadyArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { byAda, testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { ArchiveCustomerService } from './archive-customer.service'

describe('ArchiveCustomerService', () => {
  const setup = async () => {
    const { repository, audit, unitOfWork, clock, ids } = testCustomers()
    await new CreateCustomerService(unitOfWork, clock, ids).execute('org-1', { name: 'Ada' }, byAda)
    return { repository, audit, service: new ArchiveCustomerService(unitOfWork, clock, ids) }
  }

  it('archives the customer today, at the next version, and keeps it', async () => {
    const { repository, service } = await setup()

    expect(await service.execute('org-1', 'id-1', byAda)).toMatchObject({
      archivedAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
      version: 2
    })
    expect((await repository.findById('org-1', 'id-1'))?.archivedAt).toEqual(new Date('2026-11-07T10:00:00.000Z'))
  })

  it('records who archived it, with no field (ADR 0061)', async () => {
    const { audit, service } = await setup()

    await service.execute('org-1', 'id-1', byAda)

    expect(
      (await audit.list('org-1', { limit: 10 })).map(({ id, actor, resourceId, action, fields }) => ({
        id,
        actor,
        resourceId,
        action,
        fields
      }))
    ).toEqual([
      { id: 'id-3', actor: byAda, resourceId: 'id-1', action: 'archived', fields: [] },
      { id: 'id-2', actor: byAda, resourceId: 'id-1', action: 'created', fields: ['name'] }
    ])
  })

  it('refuses to archive twice', async () => {
    const { service } = await setup()
    await service.execute('org-1', 'id-1', byAda)

    await expect(service.execute('org-1', 'id-1', byAda)).rejects.toThrow(CustomerAlreadyArchivedException)
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', byAda)).rejects.toThrow(CustomerNotFoundException)
  })
})
