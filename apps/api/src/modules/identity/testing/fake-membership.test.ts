import { FakeMembership } from './fake-membership'

describe('FakeMembership', () => {
  it('names the members it was given, of the organization asked for, among the ids asked for', async () => {
    const membership = new FakeMembership()
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} }, 'Ada')
    membership.add({ userId: 'user-bob', organizationId: 'org-2', roles: ['owner'], permissions: {} })

    expect(await membership.namesOf('org-1', ['user-ada', 'user-bob'])).toEqual(new Map([['user-ada', 'Ada']]))
    expect(await membership.namesOf('org-2', ['user-bob'])).toEqual(new Map([['user-bob', 'user-bob']]))
  })
})
