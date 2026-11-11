import type { CustomerChange } from './domain/customer'

/**
 * The customers' history, append only (ADR 0052). Every method takes or carries the organization,
 * as the repository's do (ADR 0033).
 */
export interface CustomerChangeLog {
  /** Fails when a change with the same id is already kept. */
  append(change: CustomerChange): Promise<void>
  /** The organization's changes, oldest first, then by id. */
  list(organizationId: string): Promise<CustomerChange[]>
}
