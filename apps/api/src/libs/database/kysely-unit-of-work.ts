import type { Kysely } from 'kysely'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'

/**
 * A Postgres transaction per `run` (ADR 0052). `bind` builds the repositories on the transaction, the
 * same adapter classes the composition root builds on the pool. It holds one connection of the pool
 * until `work` ends, so `work` stays short and never asks the pool for another.
 */
export class KyselyUnitOfWork<Repositories> implements UnitOfWork<Repositories> {
  readonly #db: Kysely<unknown>
  readonly #bind: (transaction: Kysely<unknown>) => Repositories

  constructor(db: Kysely<unknown>, bind: (transaction: Kysely<unknown>) => Repositories) {
    this.#db = db
    this.#bind = bind
  }

  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.#db.transaction().execute((transaction) => work(this.#bind(transaction)))
  }
}
