import type { InMemoryStore } from '#libs/adapters/in-memory-unit-of-work'
import { SubscriptionChangedException } from '../billing.errors'
import type { BillingDirectory, ProviderIds } from '../billing-directory.port'
import type { Subscription } from '../subscription'
import type { SubscriptionRepository } from '../subscription-repository.port'

/**
 * The subscription rows of use-case and job tests, under the same contract suite as the database
 * adapter; also the directory the job finds an organization in.
 */
export class InMemorySubscriptionRepository implements SubscriptionRepository, BillingDirectory, InMemoryStore {
  #rows = new Map<string, Subscription>()

  snapshot(): () => void {
    const before = new Map(this.#rows)
    return () => {
      this.#rows = before
    }
  }

  async find(organizationId: string): Promise<Subscription | null> {
    return this.#rows.get(organizationId) ?? null
  }

  async save(subscription: Subscription): Promise<Subscription> {
    const stored = this.#rows.get(subscription.organizationId)
    if ((stored?.version ?? 0) !== subscription.version) throw new SubscriptionChangedException()
    const saved = { ...subscription, version: subscription.version + 1 }
    this.#rows.set(subscription.organizationId, saved)
    return saved
  }

  async organizationsFor(provider: string, { subscriptionId, checkoutId, customerId }: ProviderIds): Promise<string[]> {
    const holds = (value: string | null, id: string | undefined) => id !== undefined && value === id
    return [...this.#rows.values()]
      .filter((row) => row.provider === provider)
      .filter(
        (row) =>
          holds(row.providerSubscriptionId, subscriptionId) ||
          holds(row.checkoutPage?.id ?? null, checkoutId) ||
          holds(row.customerId, customerId)
      )
      .map((row) => row.organizationId)
  }
}
