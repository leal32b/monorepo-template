import type { InMemoryStore } from '#libs/adapters/in-memory-unit-of-work'
import type { LogoRecord } from '../logo'
import type { LogoRepository } from '../logo-repository.port'

/** The logos for use-case tests (ADR 0076), under the same contract suite as the database adapter. */
export class InMemoryLogoRepository implements LogoRepository, InMemoryStore {
  #rows = new Map<string, LogoRecord>()

  snapshot(): () => void {
    const before = new Map(this.#rows)
    return () => {
      this.#rows = before
    }
  }

  async find(organizationId: string): Promise<LogoRecord | null> {
    return this.#rows.get(organizationId) ?? null
  }

  async save(record: LogoRecord): Promise<void> {
    this.#rows.set(record.organizationId, record)
  }

  async remove(organizationId: string): Promise<void> {
    this.#rows.delete(organizationId)
  }
}
