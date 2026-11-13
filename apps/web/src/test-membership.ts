import { type OrganizationMembership, type Permissions, trial } from '@repo/contracts'

/**
 * A membership as `GET /api/organizations/:organizationId/me` answers it, for the tests: the roles and
 * permissions given, in an organization on trial with full access, as a new one is (ADR 0063).
 */
export function membershipOf(roles: string[], permissions: Permissions): OrganizationMembership {
  return {
    roles,
    permissions: permissions as OrganizationMembership['permissions'],
    subscription: {
      status: 'trialing',
      access: 'full',
      plan: null,
      nextPlan: null,
      trialEndsAt: '2026-11-15T00:00:00.000Z',
      periodStartsAt: null,
      paidThrough: null,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
      checkout: null
    },
    entitlements: { capabilities: [...trial.entitlements.capabilities], limits: { ...trial.entitlements.limits } }
  }
}
