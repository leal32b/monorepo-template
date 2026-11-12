import { CustomerNotArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { byAda, testCustomers } from '../../testing/test-customers'
import { ArchiveCustomerService } from '../archive-customer/archive-customer.service'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { DeleteCustomerService } from './delete-customer.service'

describe('DeleteCustomerService', () => {
  /** Ada is `id-1`, with her entry `id-2`. */
  const setup = async () => {
    const { repository, audit, unitOfWork, clock, ids } = testCustomers()
    const create = new CreateCustomerService(unitOfWork, clock, ids)
    const archive = new ArchiveCustomerService(unitOfWork, clock, ids)
    await create.execute('org-1', { name: 'Ada' }, byAda)
    return {
      repository,
      audit,
      unitOfWork,
      clock,
      ids,
      create,
      archive,
      service: new DeleteCustomerService(unitOfWork, clock, ids)
    }
  }

  it('deletes an archived customer and records who did it, and when, by ids only', async () => {
    const { repository, audit, archive, service } = await setup()
    await archive.execute('org-1', 'id-1', byAda)

    await service.execute('org-1', 'id-1', byAda)

    expect(await repository.findById('org-1', 'id-1')).toBeNull()
    expect((await audit.list('org-1', { limit: 1 }))[0]).toEqual({
      id: 'id-4',
      organizationId: 'org-1',
      at: new Date('2026-11-07T10:00:00.000Z'),
      actor: byAda,
      resourceType: 'customer',
      resourceId: 'id-1',
      action: 'deleted',
      fields: []
    })
  })

  it('keeps the customer when its entry cannot be recorded (ADR 0052)', async () => {
    const { repository, audit, unitOfWork, clock, archive } = await setup()
    await archive.execute('org-1', 'id-1', byAda)
    const service = new DeleteCustomerService(unitOfWork, clock, { generate: () => 'id-2' })

    await expect(service.execute('org-1', 'id-1', byAda)).rejects.toThrow()

    expect(await repository.findById('org-1', 'id-1')).not.toBeNull()
    expect((await audit.list('org-1', { limit: 10 })).map((entry) => entry.action)).toEqual(['archived', 'created'])
  })

  it('keeps an active customer, and records nothing: it is archived first', async () => {
    const { repository, audit, service } = await setup()

    await expect(service.execute('org-1', 'id-1', byAda)).rejects.toThrow(CustomerNotArchivedException)
    expect(await repository.findById('org-1', 'id-1')).not.toBeNull()
    expect(await audit.list('org-1', { limit: 10 })).toHaveLength(1)
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', byAda)).rejects.toThrow(CustomerNotFoundException)
  })
})
