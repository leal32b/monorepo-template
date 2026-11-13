import { CustomerNotArchivedException, CustomerNotFoundException } from '../../domain/customers.errors'
import { byAda, testCustomers } from '../../testing/test-customers'
import { ArchiveCustomerService } from '../archive-customer/archive-customer.service'
import { CreateCustomerService } from '../create-customer/create-customer.service'
import { RestoreCustomerService } from './restore-customer.service'

describe('RestoreCustomerService', () => {
  const setup = async () => {
    const { audit, unitOfWork, clock, ids } = testCustomers()
    await new CreateCustomerService(unitOfWork, clock, ids).execute('org-1', { name: 'Ada' }, byAda, null)
    return {
      audit,
      create: new CreateCustomerService(unitOfWork, clock, ids),
      archive: new ArchiveCustomerService(unitOfWork, clock, ids),
      service: new RestoreCustomerService(unitOfWork, clock, ids)
    }
  }

  it('makes an archived customer active again, at the next version', async () => {
    const { archive, service } = await setup()
    await archive.execute('org-1', 'id-1', byAda)

    expect(await service.execute('org-1', 'id-1', byAda, null)).toMatchObject({ archivedAt: null, version: 3 })
  })

  it('records who restored it, with no field (ADR 0061)', async () => {
    const { audit, archive, service } = await setup()
    await archive.execute('org-1', 'id-1', byAda)

    await service.execute('org-1', 'id-1', { kind: 'member', id: 'user-bob' }, null)

    expect((await audit.list('org-1', { limit: 1 }))[0]).toMatchObject({
      id: 'id-4',
      actor: { kind: 'member', id: 'user-bob' },
      resourceType: 'customer',
      resourceId: 'id-1',
      action: 'restored',
      fields: []
    })
  })

  it('refuses to restore an active customer', async () => {
    const { service } = await setup()

    await expect(service.execute('org-1', 'id-1', byAda, null)).rejects.toThrow(CustomerNotArchivedException)
  })

  it('does not find a customer of another organization', async () => {
    const { service } = await setup()

    await expect(service.execute('org-2', 'id-1', byAda, null)).rejects.toThrow(CustomerNotFoundException)
  })

  it("refuses to restore a customer once the active ones fill the plan's limit, and writes nothing (ADR 0063)", async () => {
    const { audit, archive, service, create } = await setup()
    await archive.execute('org-1', 'id-1', byAda)
    await create.execute('org-1', { name: 'Bob' }, byAda, null)

    await expect(service.execute('org-1', 'id-1', byAda, 1)).rejects.toMatchObject({
      code: 'plan_limit_reached',
      entitlement: 'customers.max',
      limit: 1
    })
    expect((await audit.list('org-1', { limit: 1 }))[0]).toMatchObject({ resourceId: 'id-4', action: 'created' })
    await expect(service.execute('org-1', 'id-1', byAda, 2)).resolves.toMatchObject({ archivedAt: null })
  })
})
