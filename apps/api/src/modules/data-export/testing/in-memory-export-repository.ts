import type { InMemoryStore } from '#libs/adapters/in-memory-unit-of-work'
import type { ExportRepository } from '../export-repository.port'
import type { ExportRecord } from '../organization-export'

/** The exports for use-case tests (ADR 0074), under the same contract suite as the database adapter. */
export class InMemoryExportRepository implements ExportRepository, InMemoryStore {
  #rows = new Map<string, ExportRecord>()

  snapshot(): () => void {
    const before = new Map(this.#rows)
    return () => {
      this.#rows = before
    }
  }

  async find(organizationId: string): Promise<ExportRecord | null> {
    return this.#rows.get(organizationId) ?? null
  }

  async replace(record: ExportRecord): Promise<void> {
    this.#rows.set(record.organizationId, record)
  }

  async complete(record: ExportRecord): Promise<boolean> {
    const row = this.#rows.get(record.organizationId)
    if (row?.id !== record.id || row.readyAt !== null) return false
    this.#rows.set(record.organizationId, record)
    return true
  }
}
