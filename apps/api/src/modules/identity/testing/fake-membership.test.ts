import { FakeMembership } from './fake-membership'

describe('FakeMembership', () => {
  it('gives a member an organization that pays for a plan with full access, unless the test says otherwise', async () => {
    const membership = new FakeMembership()
    const basic = { capabilities: [], limits: { 'customers.max': 100 } }
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} })
    membership.add({
      userId: 'user-ada',
      organizationId: 'org-2',
      roles: ['owner'],
      permissions: {},
      subscription: { status: 'past_due', access: 'read-only' },
      entitlements: basic
    })

    expect(await membership.memberOf('org-1', 'user-ada')).toMatchObject({
      subscription: { status: 'active', access: 'full', plan: 'pro' },
      entitlements: { limits: { 'customers.max': null } }
    })
    expect(await membership.memberOf('org-2', 'user-ada')).toMatchObject({
      subscription: { status: 'past_due', access: 'read-only', plan: 'pro' },
      entitlements: basic
    })
  })

  it('names the members it was given, of the organization asked for, among the ids asked for', async () => {
    const membership = new FakeMembership()
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['owner'], permissions: {} }, 'Ada')
    membership.add({ userId: 'user-bob', organizationId: 'org-2', roles: ['owner'], permissions: {} })

    expect(await membership.namesOf('org-1', ['user-ada', 'user-bob'])).toEqual(new Map([['user-ada', 'Ada']]))
    expect(await membership.namesOf('org-2', ['user-bob'])).toEqual(new Map([['user-bob', 'user-bob']]))
  })
})
