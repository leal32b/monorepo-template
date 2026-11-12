import { customerSchema } from '@repo/contracts'
import { CustomerEmailTakenException } from '../../domain/customers.errors'
import { byAda, testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from './create-customer.service'

describe('CreateCustomerService', () => {
  const setup = () => {
    const { repository, audit, unitOfWork, clock, ids } = testCustomers()
    return { repository, audit, service: new CreateCustomerService(unitOfWork, clock, ids) }
  }

  it('creates an active customer in the organization, with the id and the day it draws', async () => {
    const { repository, service } = setup()

    const created = await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda)

    expect(created).toEqual({
      id: 'id-1',
      name: 'Ada',
      email: 'ada@example.com',
      phone: null,
      company: null,
      notes: null,
      createdAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
      archivedAt: null,
      version: 1
    })
    expect(customerSchema.safeParse(created).success).toBe(true)
    expect(await repository.findById('org-1', 'id-1')).not.toBeNull()
    expect(await repository.findById('org-2', 'id-1')).toBeNull()
  })

  it('records who created it and which fields they filled, not their values (ADR 0061)', async () => {
    const { audit, service } = setup()

    await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda)

    expect(await audit.list('org-1', { limit: 10 })).toEqual([
      {
        id: 'id-2',
        organizationId: 'org-1',
        at: new Date('2026-11-07T10:00:00.000Z'),
        actor: byAda,
        resourceType: 'customer',
        resourceId: 'id-1',
        action: 'created',
        fields: ['name', 'email']
      }
    ])
  })

  it('refuses an email another customer of the organization has, and records nothing of it', async () => {
    const { audit, service } = setup()
    await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda)

    await expect(service.execute('org-1', { name: 'Other', email: 'ada@example.com' }, byAda)).rejects.toThrow(
      CustomerEmailTakenException
    )
    expect(await audit.list('org-1', { limit: 10 })).toHaveLength(1)
  })
})
