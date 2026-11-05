import type { AuthClient } from '#shared/api'
import { membersQuery } from './members-query'
import { organizationsQuery } from './organizations-query'
import { pendingInvitationsQuery } from './pending-invitations-query'
import { rolesQuery } from './roles-query'

/**
 * Starts the reads the members and roles screens make, as soon as the organization their address names is
 * known, beside what the caller may do there (ADR 0038): its members, its roles and its pending invitations.
 * An address that names none of the user's organizations asks for nothing more.
 */
export async function preloadTeam(auth: AuthClient, slug: string): Promise<void> {
  const organization = (await organizationsQuery(auth)()).find((candidate) => candidate.slug === slug)
  if (organization === undefined) return
  await Promise.all([
    membersQuery(auth)(organization.id),
    rolesQuery(auth)(organization.id),
    pendingInvitationsQuery(auth)(organization.id)
  ])
}
