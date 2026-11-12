import {
  CustomerChangedException,
  CustomerEmailTakenException,
  CustomerNotFoundException
} from '../../domain/customers.errors'
import { byAda, testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { UpdateCustomerService } from './update-customer.service'

describe('UpdateCustomerService', () => {
  /** Ada is `id-1` and Bob `id-3`: each creation draws the customer's id, then its entry's. */
  const setup = async () => {
    const { repository, audit, unitOfWork, clock, ids } = testCustomers()
    const create = new CreateCustomerService(unitOfWork, clock, ids)
    await create.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda)
    await create.execute('org-1', { name: 'Bob' }, byAda)
    return { repository, audit, unitOfWork, service: new UpdateCustomerService(unitOfWork, clock, ids), clock }
  }

  it('replaces the details and keeps the rest, so a field left out is cleared', async () => {
    const { service, clock } = await setup()
    clock.advance(24 * 60 * 60 * 1000)

    const updated = await service.execute('org-1', 'id-1', { name: 'Ada King', phone: '123', version: 1 }, byAda)

    expect(updated).toMatchObject({
      id: 'id-1',
      name: 'Ada King',
      email: null,
      phone: '123',
      createdAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-08T10:00:00.000Z',
      version: 2
    })
  })

  it('records who edited it, and the names of the fields that changed (ADR 0061)', async () => {
    const { audit, service, clock } = await setup()
    clock.advance(60 * 1000)

    await service.execute('org-1', 'id-1', { name: 'Ada King', email: 'ada@example.com', version: 1 }, byAda)

    expect((await audit.list('org-1', { limit: 10 }))[0]).toEqual({
      id: 'id-5',
      organizationId: 'org-1',
      at: new Date('2026-11-07T10:01:00.000Z'),
      actor: byAda,
      resourceType: 'customer',
      resourceId: 'id-1',
      action: 'updated',
      fields: ['name']
    })
  })

  it('keeps the edit when its entry cannot be recorded, never one without the other', async () => {
    const { repository, audit, unitOfWork, clock } = await setup()
    const service = new UpdateCustomerService(unitOfWork, clock, { generate: () => 'id-2' })

    await expect(service.execute('org-1', 'id-1', { name: 'Ada King', version: 1 }, byAda)).rejects.toThrow()

    expect(await repository.findById('org-1', 'id-1')).toMatchObject({ name: 'Ada', version: 1 })
    expect(await audit.list('org-1', { limit: 10 })).toHaveLength(2)
  })

  it('refuses details from someone who read an older version', async () => {
    const { service } = await setup()
    await service.execute('org-1', 'id-1', { name: 'Ada King', version: 1 }, byAda)

    await expect(service.execute('org-1', 'id-1', { name: 'Ada Byron', version: 1 }, byAda)).rejects.toThrow(
      CustomerChangedException
    )
  })

  it('does not find a customer of another organization, nor one that is not there', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', { name: 'X', version: 1 }, byAda)).rejects.toThrow(
      CustomerNotFoundException
    )
    await expect(service.execute('org-1', 'nope', { name: 'X', version: 1 }, byAda)).rejects.toThrow(
      CustomerNotFoundException
    )
  })

  it('refuses an email another customer has', async () => {
    const { service } = await setup()

    await expect(
      service.execute('org-1', 'id-3', { name: 'Bob', email: 'ada@example.com', version: 1 }, byAda)
    ).rejects.toThrow(CustomerEmailTakenException)
  })
})
