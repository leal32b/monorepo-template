import type { AuditCursor, AuditEntry, AuditTrail } from '#libs/ports/audit-trail.port'
import type { InMemoryStore } from './in-memory-unit-of-work'

/** The audit trail for use-case tests (ADR 0061), under the same contract suite as the database adapter. */
export class InMemoryAuditTrail implements AuditTrail, InMemoryStore {
  #entries = new Map<string, AuditEntry>()

  snapshot(): () => void {
    const before = new Map(this.#entries)
    return () => {
      this.#entries = before
    }
  }

  async record(entry: AuditEntry): Promise<void> {
    if (this.#entries.has(entry.id)) throw new Error(`audit entry ${entry.id} is already kept`)
    this.#entries.set(entry.id, entry)
  }

  async list(organizationId: string, page: { before?: AuditCursor | undefined; limit: number }): Promise<AuditEntry[]> {
    const { before } = page
    return [...this.#entries.values()]
      .filter((entry) => entry.organizationId === organizationId)
      .filter((entry) => before === undefined || newestFirst(entry, before) > 0)
      .sort(newestFirst)
      .slice(0, page.limit)
  }
}

/**
 * Negative when `a` comes first: the later instant, then the greater id in plain code-unit order, as
 * the adapter's `collate "C"`. Two entries never share an id.
 */
const newestFirst = (a: AuditCursor, b: AuditCursor) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : -1)
