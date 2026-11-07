import type { Customer } from './domain/customer'

export type CustomerFilter = {
  status: 'active' | 'archived'
  /** Part of the name, email or company, in any case. */
  search?: string | undefined
  /** From 1. */
  page: number
  pageSize: number
}

/**
 * Where customers are kept. Every method takes the organization: the tenant is part of the key, so
 * no call can reach another organization's customer (ADR 0033). The first repository port of the
 * template; a module copies its shape.
 */
export interface CustomerRepository {
  /** Throws `CustomerEmailTakenException` when another customer of the organization has the email. */
  insert(customer: Customer): Promise<void>
  /** Replaces the stored customer with the same id. Same exception as `insert`. */
  save(customer: Customer): Promise<void>
  findById(organizationId: string, id: string): Promise<Customer | null>
  /** Ordered by name (any case), then id, so a page never reshuffles. `total` counts the whole filter. */
  list(organizationId: string, filter: CustomerFilter): Promise<{ items: Customer[]; total: number }>
  remove(organizationId: string, id: string): Promise<void>
}
