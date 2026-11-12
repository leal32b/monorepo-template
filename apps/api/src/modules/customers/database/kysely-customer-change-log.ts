import { type Kysely, sql } from 'kysely'
import type { CustomerChangeLog } from '../customer-change-log.port'
import type { CustomerChange } from '../domain/customer'

type CustomerChangeRow = {
  id: string
  organization_id: string
  customer_id: string
  action: CustomerChange['action']
  actor_kind: CustomerChange['actor']['kind']
  /** The member's id; null for a visitor, who has none (ADR 0059). */
  actor_id: string | null
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
        actor_kind: change.actor.kind,
        actor_id: change.actor.kind === 'member' ? change.actor.id : null,
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
      // The table's check keeps a member's id beside the kind `member`, and none beside `visitor`.
      actor: row.actor_kind === 'member' ? { kind: 'member', id: row.actor_id as string } : { kind: 'visitor' },
      at: row.at
    }))
  }
}
