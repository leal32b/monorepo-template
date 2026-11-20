import { backOfficeUserPageSchema } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { InMemoryBackOffice } from '../../testing/in-memory-back-office'
import { ListUsersService } from './list-users.service'

describe('ListUsersService (ADR 0077)', () => {
  it('answers a page in the shape of the contract, with no last sign-in for a user without a session', async () => {
    const backOffice = new InMemoryBackOffice(new CountingIds(), new FixedClock(new Date('2026-11-20T00:00:00Z')))
    const user = { name: 'Ada', email: 'ada@example.test', twoFactor: true, organizations: [] }
    backOffice.users.push(
      {
        ...user,
        id: 'u-1',
        createdAt: new Date('2026-11-01T00:00:00Z'),
        lastSignInAt: new Date('2026-11-19T00:00:00Z')
      },
      { ...user, id: 'u-2', createdAt: new Date('2026-11-02T00:00:00Z'), lastSignInAt: null }
    )

    const page = await new ListUsersService(backOffice).execute({ page: 1, search: 'ada' })

    expect(backOfficeUserPageSchema.parse(page)).toEqual(page)
    expect(page.items.map(({ id, createdAt, lastSignInAt }) => ({ id, createdAt, lastSignInAt }))).toEqual([
      { id: 'u-1', createdAt: '2026-11-01T00:00:00.000Z', lastSignInAt: '2026-11-19T00:00:00.000Z' },
      { id: 'u-2', createdAt: '2026-11-02T00:00:00.000Z', lastSignInAt: null }
    ])
    expect(page.total).toBe(2)
  })
})
