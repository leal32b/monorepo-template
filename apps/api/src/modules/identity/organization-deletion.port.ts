/**
 * What another module does right before organizations are deleted, by their owner or with the account
 * of their only member (ADR 0033, ADR 0049): billing enqueues the end of their subscriptions at the
 * provider (ADR 0063). It runs before the rows go, so it can still read them; work that must wait for
 * the deletion is enqueued, never done here.
 */
export interface OrganizationDeletionListener {
  beforeDelete(organizationIds: readonly string[]): Promise<void>
}
