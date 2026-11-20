import { organizationMembershipSchema, plans } from '@repo/contracts'
import type { Member } from '../../membership.port'
import { toMembershipResponse } from './membership-response'

const member: Member = {
  userId: 'user-ada',
  organizationId: 'org-1',
  roles: ['owner'],
  permissions: { customer: ['read'] },
  subscription: {
    status: 'past_due',
    access: 'full',
    plan: 'basic',
    nextPlan: null,
    trialEndsAt: new Date('2026-10-15T00:00:00Z'),
    periodStartsAt: new Date('2026-11-01T00:00:00Z'),
    paidThrough: new Date('2026-12-01T00:00:00Z'),
    pastDueSince: new Date('2026-11-03T00:00:00Z'),
    cancelAtPeriodEnd: false,
    checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
  },
  entitlements: plans.basic.entitlements
}

describe('toMembershipResponse', () => {
  it("answers the member's roles, permissions, subscription with its dates in ISO 8601, and entitlements", () => {
    const response = toMembershipResponse(member, null)

    expect(organizationMembershipSchema.parse(response)).toEqual({
      roles: ['owner'],
      permissions: { customer: ['read'] },
      subscription: {
        status: 'past_due',
        access: 'full',
        plan: 'basic',
        nextPlan: null,
        trialEndsAt: '2026-10-15T00:00:00.000Z',
        periodStartsAt: '2026-11-01T00:00:00.000Z',
        paidThrough: '2026-12-01T00:00:00.000Z',
        pastDueSince: '2026-11-03T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
      },
      entitlements: plans.basic.entitlements,
      logo: null
    })
  })

  it('answers the organization’s logo when it has one (ADR 0076)', () => {
    const logo = { url: 'https://store.example.com/files/logos/org-1/l-1?X-Amz-Signature=x', width: 64, height: 64 }

    expect(organizationMembershipSchema.parse(toMembershipResponse(member, logo)).logo).toEqual(logo)
  })

  it('answers null for the dates a subscription does not have', () => {
    const trialing = {
      ...member,
      subscription: { ...member.subscription, periodStartsAt: null, paidThrough: null, pastDueSince: null }
    }

    expect(toMembershipResponse(trialing, null).subscription).toMatchObject({
      periodStartsAt: null,
      paidThrough: null,
      pastDueSince: null
    })
  })
})
