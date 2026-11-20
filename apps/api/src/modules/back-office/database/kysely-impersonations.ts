import { type Kysely, sql } from 'kysely'
import type { EndReason, ImpersonationRecord, Impersonations } from '../back-office-unit-of-work.port'

/** Operators' visits (`impersonation`, ADR 0077), as `app_operator`, which may add one and end it, nothing else. */
export class KyselyImpersonations implements Impersonations {
  readonly #db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.#db = db
  }

  async active(operatorId: string): Promise<ImpersonationRecord | null> {
    const { rows } = await sql<{
      id: string
      started_at: Date
      expires_at: Date
      organization_id: string
      name: string
      slug: string
    }>`
      select visit.id, visit.started_at, visit.expires_at, visit.organization_id, organization.name, organization.slug
      from impersonation visit
      join auth."organization" organization on organization.id = visit.organization_id
      where visit.operator_id = ${operatorId} and visit.ended_at is null
    `.execute(this.#db)
    const row = rows[0]
    return row === undefined
      ? null
      : {
          id: row.id,
          operatorId,
          organization: { id: row.organization_id, name: row.name, slug: row.slug },
          startedAt: row.started_at,
          expiresAt: row.expires_at
        }
  }

  async start(visit: {
    id: string
    operatorId: string
    organizationId: string
    startedAt: Date
    expiresAt: Date
  }): Promise<void> {
    await sql`
      insert into impersonation (id, operator_id, organization_id, started_at, expires_at)
      values (${visit.id}, ${visit.operatorId}, ${visit.organizationId}, ${visit.startedAt}, ${visit.expiresAt})
    `.execute(this.#db)
  }

  async end(id: string, at: Date, reason: EndReason): Promise<{ organizationId: string; operatorId: string } | null> {
    const { rows } = await sql<{ organization_id: string; operator_id: string }>`
      update impersonation set ended_at = ${at}, end_reason = ${reason}
      where id = ${id} and ended_at is null
      returning organization_id, operator_id
    `.execute(this.#db)
    const row = rows[0]
    return row === undefined ? null : { organizationId: row.organization_id, operatorId: row.operator_id }
  }
}
