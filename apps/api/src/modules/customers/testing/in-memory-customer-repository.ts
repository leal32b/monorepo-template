import type { CustomerFilter, CustomerRepository } from '../customer-repository.port'
import type { Customer } from '../domain/customer'
import {
  CustomerChangedException,
  CustomerEmailTakenException,
  CustomerNotFoundException
} from '../domain/customers.errors'

const lower = (text: string | null) => text?.toLowerCase() ?? null

/**
 * The repository for use-case tests: the same rules as the database adapter (the shared contract
 * test runs against both), with plain code-unit ordering, which is also how the adapter orders.
 */
export class InMemoryCustomerRepository implements CustomerRepository {
  readonly #customers = new Map<string, Customer>()

  async insert(customer: Customer): Promise<void> {
    this.#assertEmailFree(customer)
    this.#customers.set(customer.id, customer)
  }

  async save(customer: Customer): Promise<Customer> {
    this.#assertUnchanged(customer)
    this.#assertEmailFree(customer)
    const saved = { ...customer, version: customer.version + 1 }
    this.#customers.set(customer.id, saved)
    return saved
  }

  async findById(organizationId: string, id: string): Promise<Customer | null> {
    const customer = this.#customers.get(id)
    return customer?.organizationId === organizationId ? customer : null
  }

  async list(organizationId: string, filter: CustomerFilter): Promise<{ items: Customer[]; total: number }> {
    const needle = filter.search?.toLowerCase()
    const matching = [...this.#customers.values()]
      .filter((customer) => customer.organizationId === organizationId)
      .filter((customer) => (customer.archivedAt === null) === (filter.status === 'active'))
      .filter(
        (customer) =>
          needle === undefined ||
          [customer.name, customer.email, customer.company].some((text) => lower(text)?.includes(needle))
      )
      .sort((a, b) => compare(a.name.toLowerCase(), b.name.toLowerCase()) || compare(a.id, b.id))
    const from = (filter.page - 1) * filter.pageSize
    return { items: matching.slice(from, from + filter.pageSize), total: matching.length }
  }

  async remove(customer: Customer): Promise<void> {
    this.#assertUnchanged(customer)
    this.#customers.delete(customer.id)
  }

  /** The stored customer is the one `customer` was read from: there, and at the same version. */
  #assertUnchanged(customer: Customer): void {
    const stored = this.#customers.get(customer.id)
    if (stored?.organizationId !== customer.organizationId) throw new CustomerNotFoundException()
    if (stored.version !== customer.version) throw new CustomerChangedException()
  }

  #assertEmailFree(customer: Customer): void {
    if (customer.email === null) return
    const email = customer.email.toLowerCase()
    const taken = [...this.#customers.values()].some(
      (other) =>
        other.id !== customer.id && other.organizationId === customer.organizationId && lower(other.email) === email
    )
    if (taken) throw new CustomerEmailTakenException()
  }
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
