import { customerSchema } from '@repo/contracts'
import { CustomerEmailTakenException } from '../../domain/customers.errors'
import { testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from './create-customer.service'

describe('CreateCustomerService', () => {
  const setup = () => {
    const { repository, unitOfWork, clock, ids } = testCustomers()
    return { repository, service: new CreateCustomerService(unitOfWork, clock, ids) }
  }

  it('creates an active customer in the organization, with the id and the day it draws', async () => {
    const { repository, service } = setup()

    const created = await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' })

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

  it('refuses an email another customer of the organization has', async () => {
    const { service } = setup()
    await service.execute('org-1', { name: 'Ada', email: 'ada@example.com' })

    await expect(service.execute('org-1', { name: 'Other', email: 'ada@example.com' })).rejects.toThrow(
      CustomerEmailTakenException
    )
  })
})
