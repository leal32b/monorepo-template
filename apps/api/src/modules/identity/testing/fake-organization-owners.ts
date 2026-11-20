import type { OrganizationOwner, OrganizationOwners } from '../organization-owners.port'

/** Test double: the owner of each organization a test names; any other has none. */
export class FakeOrganizationOwners implements OrganizationOwners {
  constructor(private readonly owners: Record<string, OrganizationOwner>) {}

  async ownerOf(organizationId: string): Promise<OrganizationOwner | null> {
    return this.owners[organizationId] ?? null
  }
}
