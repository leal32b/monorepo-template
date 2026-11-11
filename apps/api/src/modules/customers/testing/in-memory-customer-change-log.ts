import type { CustomerChangeLog } from '../customer-change-log.port'
import type { CustomerChange } from '../domain/customer'

/** The change log for use-case tests, under the same contract suite as the database adapter. */
export class InMemoryCustomerChangeLog implements CustomerChangeLog {
  readonly #changes = new Map<string, CustomerChange>()

  async append(change: CustomerChange): Promise<void> {
    if (this.#changes.has(change.id)) throw new Error(`customer change ${change.id} is already kept`)
    this.#changes.set(change.id, change)
  }

  async list(organizationId: string): Promise<CustomerChange[]> {
    return [...this.#changes.values()]
      .filter((change) => change.organizationId === organizationId)
      .sort((a, b) => a.at.getTime() - b.at.getTime() || compare(a.id, b.id))
  }
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
