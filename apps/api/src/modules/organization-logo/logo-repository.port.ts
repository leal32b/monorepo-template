import type { LogoRecord } from './logo'

/** The organization's logo (ADR 0076), in the module's unit of work: one row per organization. */
export interface LogoRepository {
  /** The organization's logo, or `null` when it has none. */
  find(organizationId: string): Promise<LogoRecord | null>
  /** Puts `record` in place of the organization's logo. */
  save(record: LogoRecord): Promise<void>
  /** Removes the organization's logo, if any. */
  remove(organizationId: string): Promise<void>
}
