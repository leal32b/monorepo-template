import type { Kysely } from 'kysely'

/**
 * The platform's form of the unit of work (ADR 0052, ADR 0063): one transaction on the pool, as the
 * tables' owner, with no organization named, since its work concerns none. It is for platform tables
 * alone (`webhook_event`, `job`): `lint:deps` lets only the webhook inbox build one, so no tenant
 * table is ever written outside row-level security.
 */
export class KyselyPlatformUnitOfWork<Repositories> {
  readonly #db: Kysely<unknown>
  readonly #bind: (transaction: Kysely<unknown>) => Repositories

  constructor(db: Kysely<unknown>, bind: (transaction: Kysely<unknown>) => Repositories) {
    this.#db = db
    this.#bind = bind
  }

  /** `work`'s writes are kept when it resolves and dropped when it throws, which is thrown on. */
  runAsPlatform<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.#db.transaction().execute((transaction) => work(this.#bind(transaction)))
  }
}
