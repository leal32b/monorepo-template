import type { CustomerChangeLog } from '../customer-change-log.port'
import type { CustomerChange } from '../domain/customer'

const day = new Date('2026-11-07T10:00:00.000Z')

export function aChange(id: string, overrides: Partial<CustomerChange> = {}): CustomerChange {
  return {
    id,
    organizationId: 'org-1',
    customerId: 'c1',
    action: 'deleted',
    actorId: 'user-ada',
    at: day,
    ...overrides
  }
}

/**
 * What every `CustomerChangeLog` must do, run against the in-memory fake and the database adapter
 * alike. The organizations are those of `contractOrganizations`.
 */
export function describeCustomerChangeLog(label: string, make: () => Promise<CustomerChangeLog>): void {
  describe(`${label} as a CustomerChangeLog`, () => {
    let log: CustomerChangeLog

    beforeEach(async () => {
      log = await make()
    })

    it('keeps a change whole', async () => {
      await log.append(aChange('ch1'))

      expect(await log.list('org-1')).toEqual([aChange('ch1')])
    })

    it('lists the oldest first, then by id', async () => {
      await log.append(aChange('ch3', { at: new Date('2026-11-08T10:00:00.000Z') }))
      await log.append(aChange('ch2'))
      await log.append(aChange('ch1'))

      expect((await log.list('org-1')).map((change) => change.id)).toEqual(['ch1', 'ch2', 'ch3'])
    })

    it('shows nothing of another organization', async () => {
      await log.append(aChange('ch1'))
      await log.append(aChange('ch2', { organizationId: 'org-2' }))

      expect((await log.list('org-2')).map((change) => change.id)).toEqual(['ch2'])
    })

    it('refuses an id it already has, and keeps the first change', async () => {
      await log.append(aChange('ch1'))

      await expect(log.append(aChange('ch1', { customerId: 'c2' }))).rejects.toThrow()
      expect(await log.list('org-1')).toEqual([aChange('ch1')])
    })
  })
}
