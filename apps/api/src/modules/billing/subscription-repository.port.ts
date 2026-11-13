import type { Subscription } from './subscription'

/**
 * Where an organization's subscription row is kept (ADR 0063): one per organization, keyed by it.
 * Use cases and the job reach it only inside the module's unit of work, where row-level security
 * confines it to that organization (ADR 0055); it has no delete, since the row goes with its
 * organization.
 */
export interface SubscriptionRepository {
  /** The organization's row, or null while it has none: on trial since its creation. */
  find(organizationId: string): Promise<Subscription | null>
  /**
   * Inserts the row when `subscription.version` is 0, otherwise replaces it only while it is still at
   * that version (ADR 0048), and returns it at the next version. Throws `SubscriptionChangedException`
   * when another save came first, an insert included.
   */
  save(subscription: Subscription): Promise<Subscription>
}
