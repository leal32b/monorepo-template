/**
 * What another module does right after an organization is created (ADR 0073): billing enqueues the
 * reminder of its trial's end. It must not fail the creation: what it cannot do, it logs.
 */
export interface OrganizationCreationListener {
  afterCreate(organization: { id: string; createdAt: Date }): Promise<void>
}
