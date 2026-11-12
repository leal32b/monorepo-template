import { auditEntryPageSchema, auditPageSize } from '@repo/contracts'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import { anEntry, auditDay } from '#libs/audit/testing/audit-trail.contract'
import { FakeMembership } from '#modules/identity/testing/fake-membership'
import { decodeCursor } from '../../audit-cursor'
import { ListAuditEntriesService } from './list-audit-entries.service'

describe('ListAuditEntriesService (ADR 0061)', () => {
  const setup = () => {
    const audit = new InMemoryAuditTrail()
    const membership = new FakeMembership()
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} }, 'Ada Lovelace')
    membership.add({ userId: 'user-bob', organizationId: 'org-2', roles: ['owner'], permissions: {} }, 'Bob')
    return { audit, service: new ListAuditEntriesService(new InMemoryUnitOfWork({ audit }), membership) }
  }
  const minutes = (n: number) => new Date(auditDay.getTime() + n * 60 * 1000)

  it('answers the newest entries in the shape of the contract, naming the members who are still here', async () => {
    const { audit, service } = setup()
    await audit.record(anEntry('e1', { actor: { kind: 'visitor' }, action: 'created', fields: ['name'] }))
    await audit.record(anEntry('e2', { at: minutes(1) }))
    await audit.record(
      anEntry('e3', { at: minutes(2), actor: { kind: 'member', id: 'user-bob' }, action: 'deleted', fields: [] })
    )
    await audit.record(anEntry('e4', { at: minutes(3), actor: { kind: 'system' }, action: 'archived', fields: [] }))

    const page = await service.execute('org-1', undefined)

    expect(auditEntryPageSchema.parse(page)).toEqual(page)
    expect(page).toEqual({
      items: [
        {
          id: 'e4',
          at: '2026-11-07T10:03:00.000Z',
          actor: { kind: 'system' },
          resource: { type: 'customer', id: 'c1' },
          action: 'archived',
          fields: []
        },
        {
          id: 'e3',
          at: '2026-11-07T10:02:00.000Z',
          // Bob is a member of another organization, not of this one: he left.
          actor: { kind: 'member', id: 'user-bob', name: null },
          resource: { type: 'customer', id: 'c1' },
          action: 'deleted',
          fields: []
        },
        {
          id: 'e2',
          at: '2026-11-07T10:01:00.000Z',
          actor: { kind: 'member', id: 'user-ada', name: 'Ada Lovelace' },
          resource: { type: 'customer', id: 'c1' },
          action: 'updated',
          fields: ['name', 'email']
        },
        {
          id: 'e1',
          at: '2026-11-07T10:00:00.000Z',
          actor: { kind: 'visitor' },
          resource: { type: 'customer', id: 'c1' },
          action: 'created',
          fields: ['name']
        }
      ],
      next: null
    })
  })

  it('pages by keyset: a full page says where the next starts, and the last page says none', async () => {
    const { audit, service } = setup()
    for (let n = 0; n <= auditPageSize; n++)
      await audit.record(anEntry(`e${String(n).padStart(2, '0')}`, { at: minutes(n) }))

    const first = await service.execute('org-1', undefined)
    const cursor = decodeCursor(first.next as string)
    const second = await service.execute('org-1', cursor ?? undefined)

    expect(first.items).toHaveLength(auditPageSize)
    expect(cursor).toEqual({ at: minutes(1), id: 'e01' })
    expect(second).toMatchObject({ items: [{ id: 'e00' }], next: null })
  })

  it('shows nothing of another organization, and an empty trail as an empty page', async () => {
    const { audit, service } = setup()
    await audit.record(anEntry('e1', { organizationId: 'org-2' }))

    expect(await service.execute('org-1', undefined)).toEqual({ items: [], next: null })
  })
})
