import type { InMemoryStore } from '#libs/adapters/in-memory-unit-of-work'
import type { ExportRepository } from '../export-repository.port'
import type { ExportRecord } from '../organization-export'

type Row = { record: ExportRecord; file: Buffer | null }

/** The exports for use-case tests (ADR 0074), under the same contract suite as the database adapter. */
export class InMemoryExportRepository implements ExportRepository, InMemoryStore {
  #rows = new Map<string, Row>()

  snapshot(): () => void {
    const before = new Map(this.#rows)
    return () => {
      this.#rows = before
    }
  }

  async find(organizationId: string): Promise<ExportRecord | null> {
    return this.#rows.get(organizationId)?.record ?? null
  }

  async replace(record: ExportRecord): Promise<void> {
    this.#rows.set(record.organizationId, { record, file: null })
  }

  async complete(record: ExportRecord, file: Buffer): Promise<boolean> {
    const row = this.#rows.get(record.organizationId)
    if (row?.record.id !== record.id || row.record.readyAt !== null) return false
    this.#rows.set(record.organizationId, { record, file })
    return true
  }

  async file(organizationId: string): Promise<Buffer | null> {
    return this.#rows.get(organizationId)?.file ?? null
  }

  /** What the purge does to an expired export: the row stays, its file goes. */
  empty(organizationId: string): void {
    const row = this.#rows.get(organizationId)
    if (row !== undefined) this.#rows.set(organizationId, { ...row, file: null })
  }
}
