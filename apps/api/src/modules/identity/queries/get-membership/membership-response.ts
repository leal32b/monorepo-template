import type { Member } from '../../membership.port'

const iso = (date: Date | null) => date?.toISOString() ?? null

/** A member in the shape of `OrganizationMembership`: the subscription's instants as ISO 8601 (ADR 0053). */
export function toMembershipResponse({ roles, permissions, subscription, entitlements }: Member) {
  return {
    roles,
    permissions,
    subscription: {
      status: subscription.status,
      access: subscription.access,
      plan: subscription.plan,
      nextPlan: subscription.nextPlan,
      trialEndsAt: subscription.trialEndsAt.toISOString(),
      periodStartsAt: iso(subscription.periodStartsAt),
      paidThrough: iso(subscription.paidThrough),
      pastDueSince: iso(subscription.pastDueSince),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      checkout: subscription.checkout
    },
    entitlements
  }
}
