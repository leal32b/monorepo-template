import type { OrganizationLogo } from '@repo/contracts'

/**
 * Where the membership read finds the organization's logo (ADR 0076), so the frame draws it with no request
 * of its own, as it learns the subscription (ADR 0063). The logo module answers it.
 */
export interface OrganizationLogos {
  logoOf(organizationId: string): Promise<OrganizationLogo | null>
}
