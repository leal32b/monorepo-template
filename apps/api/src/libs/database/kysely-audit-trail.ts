import { type Kysely, sql } from 'kysely'
import type { AuditActor, AuditCursor, AuditEntry, AuditTrail } from '#libs/ports/audit-trail.port'

/** How long an entry is kept (ADR 0061); a product changes it here, for every organization. */
export const auditRetention = { days: 365 }

/** Rows deleted per statement, so a large backlog never runs into the statement limit (ADR 0047). */
const BATCH_SIZE = 5000

type AuditEntryRow = {
  id: string
  organization_id: string
  at: Date
  actor_kind: AuditActor['kind']
  /** The member's id; null for a visitor and the system, which have none. */
  actor_id: string | null
  resource_type: string
  resource_id: string
  action: string
  fields: string[]
}

type AuditDatabase = { audit_entry: AuditEntryRow }

/**
 * Postgres through Kysely (ADR 0013), built on a unit of work's transaction (ADR 0052), where the tenant
 * role may only insert and select (ADR 0061). It has no method that changes an entry.
 */
export class KyselyAuditTrail implements AuditTrail {
  readonly #db: Kysely<AuditDatabase>

  constructor(db: Kysely<unknown>) {
    this.#db = db.withTables<AuditDatabase>()
  }

  async record(entry: AuditEntry): Promise<void> {
    await this.#db
      .insertInto('audit_entry')
      .values({
        id: entry.id,
        organization_id: entry.organizationId,
        at: entry.at,
        actor_kind: entry.actor.kind,
        actor_id: entry.actor.kind === 'member' ? entry.actor.id : null,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        action: entry.action,
        fields: [...entry.fields]
      })
      .execute()
  }

  async list(organizationId: string, page: { before?: AuditCursor | undefined; limit: number }): Promise<AuditEntry[]> {
    const { before } = page
    const rows = await this.#db
      .selectFrom('audit_entry')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .$if(before !== undefined, (query) =>
        query.where(
          sql<boolean>`(at, id collate "C") < (${(before as AuditCursor).at}, ${(before as AuditCursor).id} collate "C")`
        )
      )
      .orderBy('at', 'desc')
      .orderBy(sql`id collate "C"`, 'desc')
      .limit(page.limit)
      .execute()
    return rows.map(toEntry)
  }
}

function toEntry(row: AuditEntryRow): AuditEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    at: row.at,
    // The table's check keeps a member's id beside the kind `member`, and none beside the others.
    actor: row.actor_kind === 'member' ? { kind: 'member', id: row.actor_id as string } : { kind: row.actor_kind },
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    action: row.action,
    fields: row.fields
  }
}

/**
 * Deletes the entries older than the retention, as of `now`, in batches, and returns how many went:
 * the trail's line in the daily purge (ADR 0050), run as the owner, whom the tenant policies do not bind.
 */
export async function purgeAuditEntries(
  db: Kysely<unknown>,
  now: Date,
  { batchSize = BATCH_SIZE }: { batchSize?: number } = {}
): Promise<number> {
  const before = new Date(now.getTime() - auditRetention.days * 24 * 60 * 60 * 1000)
  let total = 0
  for (;;) {
    const { numAffectedRows } = await sql`
      delete from audit_entry
      where id in (select id from audit_entry where at < ${before} limit ${batchSize})
    `.execute(db)
    const deleted = Number(numAffectedRows)
    total += deleted
    if (deleted < batchSize) return total
  }
}
