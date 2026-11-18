import type { Kysely } from 'kysely'
import type { BillingDirectory, ProviderIds } from '../billing-directory.port'

type DirectoryDatabase = {
  subscription: {
    organization_id: string
    provider: string | null
    provider_subscription_id: string | null
    provider_customer_id: string | null
    checkout_id: string | null
  }
}

/**
 * Finds the organization a notice is about (ADR 0063), on the pool as the tables' owner, as the
 * membership read does: the job has no organization yet, so no tenant transaction can be opened. It
 * selects the organization's id alone, by the provider's ids our rows hold.
 */
export class KyselyBillingDirectory implements BillingDirectory {
  readonly #db: Kysely<DirectoryDatabase>

  constructor(db: Kysely<unknown>) {
    this.#db = db.withTables<DirectoryDatabase>()
  }

  async organizationsFor(provider: string, { subscriptionId, checkoutId, customerId }: ProviderIds): Promise<string[]> {
    const held = [
      ['provider_subscription_id', subscriptionId],
      ['checkout_id', checkoutId],
      ['provider_customer_id', customerId]
    ] as const
    const named = held.filter((pair): pair is [(typeof pair)[0], string] => pair[1] !== undefined)
    if (named.length === 0) return []
    const rows = await this.#db
      .selectFrom('subscription')
      .select('organization_id')
      .where('provider', '=', provider)
      .where((eb) => eb.or(named.map(([column, id]) => eb(column, '=', id))))
      .execute()
    return rows.map((row) => row.organization_id)
  }
}
