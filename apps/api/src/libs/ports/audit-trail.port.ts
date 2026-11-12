/**
 * Who made a change (ADR 0061): a member of the organization, by user id; a visitor of its public
 * surface, who has none (ADR 0059); or the system, such as a job. An operator (P1-7) joins the union.
 */
export type AuditActor = { kind: 'member'; id: string } | { kind: 'visitor' } | { kind: 'system' }

/**
 * One line of an organization's audit trail (ADR 0061): who did what to which record, and when. Ids,
 * codes and field names only: never a value, so a record deleted for good leaves no personal data here.
 */
export type AuditEntry = {
  id: string
  organizationId: string
  at: Date
  actor: AuditActor
  /** A stable code the web translates, such as `customer`. */
  resourceType: string
  /** The record's own id, never a natural key such as an email. */
  resourceId: string
  /** A stable code the web translates, such as `deleted`. */
  action: string
  /** The names of the fields the change set (for a create, those filled); empty for a change of state. */
  fields: readonly string[]
}

/** Where a page of the trail starts: just older than this entry. */
export type AuditCursor = { at: Date; id: string }

/**
 * An organization's audit trail, append only (ADR 0061). A use case records inside the unit of work of
 * its change (ADR 0052), so the entry exists if and only if the change does. There is no way to change
 * or remove an entry: the purge does that, by retention, outside any request.
 */
export interface AuditTrail {
  /** Fails when an entry with the same id is already kept. */
  record(entry: AuditEntry): Promise<void>
  /** The organization's entries, newest first, then by id from last to first, older than `before` when given. */
  list(organizationId: string, page: { before?: AuditCursor | undefined; limit: number }): Promise<AuditEntry[]>
}
