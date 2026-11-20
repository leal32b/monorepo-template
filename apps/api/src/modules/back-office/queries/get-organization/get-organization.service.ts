import { accessOf, type BackOfficeOrganizationDetail, type Currency, type SubscriptionState } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import { OrganizationNotFoundException } from '../../back-office.exceptions'
import type { BackOfficeUnitOfWork } from '../../back-office-unit-of-work.port'

const iso = (date: Date | null) => (date === null ? null : date.toISOString())

/** The subscription as the contract says it, with what it lets members do now (ADR 0063). */
export function subscriptionResponse(subscription: SubscriptionState, now: Date) {
  return {
    ...subscription,
    access: accessOf(subscription, now),
    trialEndsAt: subscription.trialEndsAt.toISOString(),
    periodStartsAt: iso(subscription.periodStartsAt),
    paidThrough: iso(subscription.paidThrough),
    pastDueSince: iso(subscription.pastDueSince)
  }
}

/** One organization's state and members, for its page in the back office (ADR 0077). */
export class GetOrganizationService {
  constructor(
    private readonly unitOfWork: BackOfficeUnitOfWork,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string): Promise<BackOfficeOrganizationDetail> {
    const found = await this.unitOfWork.read(({ directory }) => directory.organization(organizationId))
    if (found === null) throw new OrganizationNotFoundException()
    return {
      ...found,
      currency: found.currency as Currency,
      createdAt: found.createdAt.toISOString(),
      subscription: subscriptionResponse(found.subscription, this.clock.now()),
      members: found.members.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() }))
    }
  }
}
