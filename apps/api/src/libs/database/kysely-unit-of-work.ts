import { type Kysely, sql } from 'kysely'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'

/** The role tenant transactions run as: created, and granted each tenant table, by the migrations (ADR 0055). */
const TENANT_ROLE = 'app_tenant'

/**
 * A Postgres transaction per `run` (ADR 0052), confined to one organization (ADR 0055): its first
 * statement switches to the tenant role and names the organization, both for this transaction only,
 * so row-level security shows and accepts that organization's rows alone, and nothing of it reaches
 * the next request through the pool or a pooler. `bind` builds the repositories on the transaction.
 * It holds one connection of the pool until `work` ends, so `work` stays short and never asks the
 * pool for another.
 */
export class KyselyUnitOfWork<Repositories> implements UnitOfWork<Repositories> {
  readonly #db: Kysely<unknown>
  readonly #bind: (transaction: Kysely<unknown>) => Repositories

  constructor(db: Kysely<unknown>, bind: (transaction: Kysely<unknown>) => Repositories) {
    this.#db = db
    this.#bind = bind
  }

  run<T>(organizationId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.#db.transaction().execute(async (transaction) => {
      await sql`
        select set_config('role', ${TENANT_ROLE}, true), set_config('app.organization_id', ${organizationId}, true)
      `.execute(transaction)
      return work(this.#bind(transaction))
    })
  }
}
