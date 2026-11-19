import type { Locale } from '#libs/notifications/locales'

/** Whom a module writes to about an organization (ADR 0073), and what its texts need of the organization. */
export type OrganizationOwner = {
  email: string
  /** The owner's language, chosen at sign-up. */
  locale: Locale
  organization: { name: string; slug: string; timeZone: string }
}

/**
 * The owner of an organization, for the notifications another module sends them (ADR 0073): the
 * organization's state, such as a new customer or its subscription. Read outside any unit of work.
 */
export interface OrganizationOwners {
  /** The oldest owner, or `null` when the organization has none or is gone. */
  ownerOf(organizationId: string): Promise<OrganizationOwner | null>
}
