import type { Permissions } from '@repo/contracts'

/**
 * A user's place in one organization (ADR 0033): their roles and what those roles hold, built-in and
 * custom roles resolved. Product modules see this, never Better Auth's types.
 */
export type Member = {
  userId: string
  organizationId: string
  roles: string[]
  permissions: Permissions
}

/** Who belongs to which organization. */
export interface Membership {
  /** `userId` in `organizationId`, or `null` when they are not a member or the organization does not exist. */
  memberOf(organizationId: string, userId: string): Promise<Member | null>
  /**
   * The names of those of `userIds` who are members of `organizationId` now, by user id: someone who
   * left, or whose account is gone, is not in the map. How the audit trail names its actors (ADR 0061).
   */
  namesOf(organizationId: string, userIds: readonly string[]): Promise<Map<string, string>>
}
