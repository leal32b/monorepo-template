import { testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { RegisterCustomerService } from './register-customer.service'

describe('RegisterCustomerService (ADR 0059)', () => {
  const setup = () => {
    const { repository, changes, unitOfWork, clock, ids } = testCustomers()
    return {
      repository,
      changes,
      unitOfWork,
      clock,
      service: new RegisterCustomerService(unitOfWork, clock, ids),
      create: new CreateCustomerService(unitOfWork, clock, ids)
    }
  }

  it('adds an active customer to the organization and records that a visitor created it', async () => {
    const { repository, changes, service } = setup()

    await service.execute('org-1', { name: 'Grace', email: 'grace@example.com', phone: null })

    expect(await repository.findById('org-1', 'id-1')).toMatchObject({
      name: 'Grace',
      email: 'grace@example.com',
      phone: null,
      company: null,
      notes: null,
      archivedAt: null,
      version: 1
    })
    expect(await changes.list('org-1')).toEqual([
      {
        id: 'id-2',
        organizationId: 'org-1',
        customerId: 'id-1',
        action: 'created',
        actor: { kind: 'visitor' },
        at: new Date('2026-11-07T10:00:00.000Z')
      }
    ])
    expect(await repository.list('org-2', { status: 'active', page: 1, pageSize: 10 })).toMatchObject({ total: 0 })
  })

  it('reads a field left out as empty', async () => {
    const { repository, service } = setup()

    await service.execute('org-1', { name: 'Grace', phone: '555 0100' })

    expect(await repository.findById('org-1', 'id-1')).toMatchObject({ email: null, phone: '555 0100' })
  })

  it('ends the same way when the email is already a customer, and changes nothing', async () => {
    const { repository, changes, service, create } = setup()
    await create.execute('org-1', { name: 'Grace Hopper', email: 'grace@example.com', notes: 'Since 1952' })

    await expect(
      service.execute('org-1', { name: 'Someone else', email: 'grace@example.com', phone: '555 0100' })
    ).resolves.toBeUndefined()

    expect(await repository.list('org-1', { status: 'active', page: 1, pageSize: 10 })).toMatchObject({
      total: 1,
      items: [{ name: 'Grace Hopper', phone: null, notes: 'Since 1952' }]
    })
    expect(await changes.list('org-1')).toEqual([])
  })

  it('keeps no customer when its record cannot be written, and says so', async () => {
    const { repository, unitOfWork, clock } = setup()
    const service = new RegisterCustomerService(unitOfWork, clock, { generate: () => 'the-same-id' })
    await service.execute('org-1', { name: 'Grace', phone: '555 0100' })
    const second = new RegisterCustomerService(unitOfWork, clock, {
      generate: (() => {
        const ids = ['another-id', 'the-same-id']
        return () => ids.shift() as string
      })()
    })

    await expect(second.execute('org-1', { name: 'Ada', phone: '555 0101' })).rejects.toThrow()

    expect(await repository.findById('org-1', 'another-id')).toBeNull()
  })
})
