/**
 * An organization as a public route sees it (ADR 0059): its id, for the unit of work, and what its
 * public profile shows. Never sent as it is: the id stays in the API.
 */
export type PublicOrganization = {
  id: string
  name: string
  slug: string
  timeZone: string
  currency: string
}

/**
 * Organizations found without a session, by the slug in a public route's path (ADR 0059). The one
 * place every public route passes: a product whose tenants must opt in to a public page checks it here.
 */
export interface PublicOrganizations {
  /** The organization with this slug, or `null` when there is none. */
  bySlug(slug: string): Promise<PublicOrganization | null>
}
