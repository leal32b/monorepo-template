import type { ExportRecord } from './organization-export'

/** The organization's last export (ADR 0074), in the module's unit of work: one row per organization. */
export interface ExportRepository {
  /** The organization's last export, without its file, or `null` when none was asked for. */
  find(organizationId: string): Promise<ExportRecord | null>
  /** Puts `record`, just asked for, in place of the organization's last export and its file. */
  replace(record: ExportRecord): Promise<void>
  /**
   * Saves the export `record.id`, now ready, with its file. `false`, and nothing saved, when that export is no
   * longer the organization's last one (a new request replaced it) or is ready already (the job ran twice).
   */
  complete(record: ExportRecord, file: Buffer): Promise<boolean>
  /** The file of the organization's last export, or `null` when it has none (pending, or emptied by the purge). */
  file(organizationId: string): Promise<Buffer | null>
}
