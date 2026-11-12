import type { PublicOrganization, PublicOrganizations } from '../public-organizations.port'

/** Test double: the organizations a test gives it, and the slugs it was asked for. */
export class FakePublicOrganizations implements PublicOrganizations {
  readonly lookups: string[] = []
  readonly #organizations: PublicOrganization[]

  constructor(organizations: PublicOrganization[]) {
    this.#organizations = organizations
  }

  async bySlug(slug: string): Promise<PublicOrganization | null> {
    this.lookups.push(slug)
    return this.#organizations.find((organization) => organization.slug === slug) ?? null
  }
}
