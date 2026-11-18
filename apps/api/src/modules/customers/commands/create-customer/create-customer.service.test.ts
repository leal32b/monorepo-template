import { customerSchema } from '@repo/contracts'
import { CustomerEmailTakenException } from '../../domain/customers.errors'
import { aCustomer } from '../../testing/customer-repository.contract'
import { byAda, testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from './create-customer.service'

describe('CreateCustomerService', () => {
  const setup = () => {
    const { repository, audit, unitOfWork, clock, ids } = testCustomers()
    return { repository, audit, service: new CreateCustomerService(unitOfWork, clock, ids) }
  }

  it('creates an active customer in the organization, with the id and the day it draws', async () => {
    const { repository, service } = setup()

    const created = await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda, null)

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

    await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda, null)

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
    await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' }, byAda, null)

    await expect(service.execute('org-1', { name: 'Other', email: 'ada@example.com' }, byAda, null)).rejects.toThrow(
      CustomerEmailTakenException
    )
    expect(await audit.list('org-1', { limit: 10 })).toHaveLength(1)
  })

  describe("the plan's limit (ADR 0063)", () => {
    it('refuses one more active customer at the limit, naming it, and writes nothing', async () => {
      const { repository, audit, service } = setup()
      await service.execute('org-1', { name: 'Ada' }, byAda, 2)
      await service.execute('org-1', { name: 'Bob' }, byAda, 2)

      await expect(service.execute('org-1', { name: 'Cy' }, byAda, 2)).rejects.toMatchObject({
        code: 'plan_limit_reached',
        entitlement: 'customers.max',
        limit: 2
      })
      expect(await repository.countActive('org-1')).toBe(2)
      expect(await audit.list('org-1', { limit: 10 })).toHaveLength(2)
    })

    it('counts only the active customers of the organization', async () => {
      const { repository, service } = setup()
      await repository.insert(aCustomer('archived', { archivedAt: new Date('2026-11-07T10:00:00.000Z') }))
      await repository.insert(aCustomer('elsewhere', { organizationId: 'org-2' }))

      await expect(service.execute('org-1', { name: 'Ada' }, byAda, 1)).resolves.toMatchObject({ name: 'Ada' })
    })

    it('creates with no count at all when the plan has no limit', async () => {
      const { repository, service } = setup()
      const countActive = vi.spyOn(repository, 'countActive')

      await service.execute('org-1', { name: 'Ada' }, byAda, null)

      expect(countActive).not.toHaveBeenCalled()
    })
  })
})
