import { type AuditEntryPage, type AuditEntry as AuditEntryResponse, auditPageSize } from '@repo/contracts'
import type { AuditCursor, AuditEntry } from '#libs/ports/audit-trail.port'
import type { Membership } from '#modules/identity/index'
import { encodeCursor } from '../../audit-cursor'
import type { AuditUnitOfWork } from '../../audit-unit-of-work.port'

/**
 * A page of the organization's trail, newest first (ADR 0061). The page is read inside the unit of
 * work, one entry more than it shows, to know whether another follows; the members' names are asked
 * of identity after `run` returns, on the pool, since the tenant role cannot read the `auth` schema
 * and nothing but the transaction's own work belongs inside it (ADR 0052).
 */
export class ListAuditEntriesService {
  constructor(
    private readonly unitOfWork: AuditUnitOfWork,
    private readonly membership: Membership
  ) {}

  async execute(organizationId: string, before: AuditCursor | undefined): Promise<AuditEntryPage> {
    const read = await this.unitOfWork.run(organizationId, ({ audit }) =>
      audit.list(organizationId, { before, limit: auditPageSize + 1 })
    )
    const entries = read.slice(0, auditPageSize)
    const members = new Set(entries.flatMap(({ actor }) => (actor.kind === 'member' ? [actor.id] : [])))
    const names = await this.membership.namesOf(organizationId, [...members])
    const last = entries.at(-1)
    return {
      items: entries.map((entry) => toResponse(entry, names)),
      next: read.length > auditPageSize && last !== undefined ? encodeCursor(last) : null
    }
  }
}

/** An entry in the shape of the contract. Its codes are the ones the contract lists (`auditActions`). */
function toResponse(entry: AuditEntry, names: Map<string, string>): AuditEntryResponse {
  return {
    id: entry.id,
    at: entry.at.toISOString(),
    actor: entry.actor.kind === 'member' ? { ...entry.actor, name: names.get(entry.actor.id) ?? null } : entry.actor,
    resource: { type: entry.resourceType as AuditEntryResponse['resource']['type'], id: entry.resourceId },
    action: entry.action as AuditEntryResponse['action'],
    fields: [...entry.fields]
  }
}
