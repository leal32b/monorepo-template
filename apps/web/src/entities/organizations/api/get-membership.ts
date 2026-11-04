import { type OrganizationMembership, organizationMembershipSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/**
 * The caller's roles in an organization and what they resolve to, from the API's tenant guard
 * (ADR 0033). 404 when the caller is not a member, which is what the API says for one that does
 * not exist too.
 */
export function getMembership(api: ApiClient, organizationId: string): Promise<OrganizationMembership> {
  return api.get(`/api/organizations/${encodeURIComponent(organizationId)}/me`, organizationMembershipSchema)
}
