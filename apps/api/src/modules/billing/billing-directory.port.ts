/** The provider's ids a notice names (ADR 0063). */
export type ProviderIds = {
  subscriptionId?: string | undefined
  checkoutId?: string | undefined
  customerId?: string | undefined
}

/**
 * Which organization a provider's notice is about, found by our own rows (ADR 0063): the one whose row
 * holds the provider's subscription, its open checkout or its customer. The only read of the table
 * across organizations; it returns ids, never a row, and the job then works inside that organization's
 * unit of work.
 */
export interface BillingDirectory {
  /** The organizations whose row holds one of `ids` at `provider`: none, one, or more when two rows disagree. */
  organizationsFor(provider: string, ids: ProviderIds): Promise<string[]>
}
