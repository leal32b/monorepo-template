import { plans } from '@repo/contracts'
import type { Member, Membership } from '../membership.port'

/** A member as a test gives it: only what the test cares about of the subscription, and what it grants if not everything. */
export type GivenMember = Omit<Member, 'subscription' | 'entitlements'> & {
  subscription?: Partial<Member['subscription']>
  entitlements?: Member['entitlements']
}

/** Unless a test says otherwise, the organization pays for a plan that grants everything, with full access. */
const paid: Pick<Member, 'subscription' | 'entitlements'> = {
  subscription: {
    status: 'active',
    access: 'full',
    plan: 'pro',
    nextPlan: null,
    trialEndsAt: new Date('2026-10-15T00:00:00Z'),
    periodStartsAt: new Date('2026-11-01T00:00:00Z'),
    paidThrough: new Date('2026-12-01T00:00:00Z'),
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: null
  },
  entitlements: plans.pro.entitlements
}

/** Test double: the members a test adds, and nobody else. */
export class FakeMembership implements Membership {
  readonly #members: { member: Member; name: string }[] = []

  /** A member, named by their user id unless a name is given, of an organization that pays unless the test says otherwise. */
  add({ subscription, entitlements = paid.entitlements, ...member }: GivenMember, name = member.userId): void {
    this.#members.push({
      member: { ...member, subscription: { ...paid.subscription, ...subscription }, entitlements },
      name
    })
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    return (
      this.#members.find(({ member }) => member.organizationId === organizationId && member.userId === userId)
        ?.member ?? null
    )
  }

  async namesOf(organizationId: string, userIds: readonly string[]): Promise<Map<string, string>> {
    return new Map(
      this.#members
        .filter(({ member }) => member.organizationId === organizationId && userIds.includes(member.userId))
        .map(({ member, name }) => [member.userId, name])
    )
  }
}
