import { byAda, testCustomers } from '../../testing/test-customers'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { RegisterCustomerService } from './register-customer.service'

describe('RegisterCustomerService (ADR 0059)', () => {
  const setup = () => {
    const { repository, audit, jobs, unitOfWork, clock, ids, owners, webOrigin } = testCustomers()
    return {
      repository,
      audit,
      jobs,
      unitOfWork,
      clock,
      owners,
      webOrigin,
      service: new RegisterCustomerService(unitOfWork, clock, ids, { owners, webOrigin }),
      create: new CreateCustomerService(unitOfWork, clock, ids)
    }
  }

  it('adds an active customer to the organization and records that a visitor created it', async () => {
    const { repository, audit, service } = setup()

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
    expect(await audit.list('org-1', { limit: 10 })).toEqual([
      {
        id: 'id-2',
        organizationId: 'org-1',
        at: new Date('2026-11-07T10:00:00.000Z'),
        actor: { kind: 'visitor' },
        resourceType: 'customer',
        resourceId: 'id-1',
        action: 'created',
        fields: ['name', 'email']
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
    const { repository, audit, service, create } = setup()
    await create.execute(
      'org-1',
      { name: 'Grace Hopper', email: 'grace@example.com', notes: 'Since 1952' },
      byAda,
      null
    )

    await expect(
      service.execute('org-1', { name: 'Someone else', email: 'grace@example.com', phone: '555 0100' })
    ).resolves.toBeUndefined()

    expect(await repository.list('org-1', { status: 'active', page: 1, pageSize: 10 })).toMatchObject({
      total: 1,
      items: [{ name: 'Grace Hopper', phone: null, notes: 'Since 1952' }]
    })
    expect((await audit.list('org-1', { limit: 10 })).map((entry) => entry.actor)).toEqual([byAda])
  })

  it('keeps no customer when its record cannot be written, and says so', async () => {
    const { repository, jobs, unitOfWork, clock, owners, webOrigin } = setup()
    const service = new RegisterCustomerService(
      unitOfWork,
      clock,
      { generate: () => 'the-same-id' },
      { owners, webOrigin }
    )
    await service.execute('org-1', { name: 'Grace', phone: '555 0100' })
    const second = new RegisterCustomerService(
      unitOfWork,
      clock,
      {
        generate: (() => {
          const ids = ['another-id', 'the-same-id']
          return () => ids.shift() as string
        })()
      },
      { owners, webOrigin }
    )

    await expect(second.execute('org-1', { name: 'Ada', phone: '555 0101' })).rejects.toThrow()

    expect(await repository.findById('org-1', 'another-id')).toBeNull()
    expect(jobs.all).toHaveLength(1)
  })

  describe('the owner’s email (ADR 0073)', () => {
    it('tells the owner through the queue, in their language and the organization’s time zone', async () => {
      const { jobs, service } = setup()

      await service.execute('org-1', { name: 'Grace', phone: '555 0100' })

      expect(jobs.all).toMatchObject([
        {
          kind: 'customers.send-email',
          state: 'pending',
          payload: {
            email: 'customerRegistered',
            to: 'ada@example.com',
            locale: 'pt-BR',
            url: 'https://app.example.com/acme/customers',
            values: { name: 'Grace', organization: 'Acme Barbers', day: '7 de novembro de 2026' }
          }
        }
      ])
    })

    it('sends nothing for an email that is already a customer, nor to the visitor', async () => {
      const { jobs, service, create } = setup()
      await create.execute('org-1', { name: 'Grace Hopper', email: 'grace@example.com' }, byAda, null)

      await service.execute('org-1', { name: 'Someone else', email: 'grace@example.com' })

      expect(jobs.all).toEqual([])
    })

    it('registers the customer and sends nothing when the organization has no owner', async () => {
      const { repository, jobs, service } = setup()

      await service.execute('org-2', { name: 'Grace', phone: '555 0100' })

      expect(await repository.findById('org-2', 'id-1')).toMatchObject({ name: 'Grace' })
      expect(jobs.all).toEqual([])
    })
  })
})
