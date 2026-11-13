import { FakeMembership } from './fake-membership'

describe('FakeMembership', () => {
  it('gives a member an organization that pays for a plan with full access, unless the test gives a subscription', async () => {
    const membership = new FakeMembership()
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} })
    const paid = (await membership.memberOf('org-1', 'user-ada'))?.subscription
    expect(paid).toMatchObject({ status: 'active', access: 'full' })

    const pastDue = { ...(paid as NonNullable<typeof paid>), status: 'past_due' as const, access: 'read-only' as const }
    membership.add({
      userId: 'user-ada',
      organizationId: 'org-2',
      roles: ['owner'],
      permissions: {},
      subscription: pastDue
    })

    expect((await membership.memberOf('org-2', 'user-ada'))?.subscription).toEqual(pastDue)
  })

  it('names the members it was given, of the organization asked for, among the ids asked for', async () => {
    const membership = new FakeMembership()
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} }, 'Ada')
    membership.add({ userId: 'user-bob', organizationId: 'org-2', roles: ['owner'], permissions: {} })

    expect(await membership.namesOf('org-1', ['user-ada', 'user-bob'])).toEqual(new Map([['user-ada', 'Ada']]))
    expect(await membership.namesOf('org-2', ['user-bob'])).toEqual(new Map([['user-bob', 'user-bob']]))
  })
})
