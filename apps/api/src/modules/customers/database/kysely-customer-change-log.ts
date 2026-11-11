import { type Kysely, sql } from 'kysely'
import type { CustomerChangeLog } from '../customer-change-log.port'
import type { CustomerChange } from '../domain/customer'

type CustomerChangeRow = {
  id: string
  organization_id: string
  customer_id: string
  action: CustomerChange['action']
  actor_id: string
  at: Date
}

type CustomerChangesDatabase = { customer_change: CustomerChangeRow }

/** Postgres through Kysely (ADR 0013), on the pool or on a unit of work's transaction (ADR 0052). */
export class KyselyCustomerChangeLog implements CustomerChangeLog {
  readonly #db: Kysely<CustomerChangesDatabase>

  constructor(db: Kysely<unknown>) {
    this.#db = db.withTables<CustomerChangesDatabase>()
  }

  async append(change: CustomerChange): Promise<void> {
    await this.#db
      .insertInto('customer_change')
      .values({
        id: change.id,
        organization_id: change.organizationId,
        customer_id: change.customerId,
        action: change.action,
        actor_id: change.actorId,
        at: change.at
      })
      .execute()
  }

  async list(organizationId: string): Promise<CustomerChange[]> {
    const rows = await this.#db
      .selectFrom('customer_change')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('at')
      .orderBy(sql`id collate "C"`)
      .execute()
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      customerId: row.customer_id,
      action: row.action,
      actorId: row.actor_id,
      at: row.at
    }))
  }
}
