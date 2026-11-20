import type { ExportRecord } from './organization-export'

/**
 * The organization's last export (ADR 0074), in the module's unit of work: one row per organization. Its
 * file is in the store, at `exports/<organization>/<id>.zip` (ADR 0076).
 */
export interface ExportRepository {
  /** The organization's last export, or `null` when none was asked for. */
  find(organizationId: string): Promise<ExportRecord | null>
  /** Puts `record`, just asked for, in place of the organization's last export. */
  replace(record: ExportRecord): Promise<void>
  /**
   * Saves the export `record.id`, now ready, its file written. `false`, and nothing saved, when that export is
   * no longer the organization's last one (a new request replaced it) or is ready already (the job ran twice).
   */
  complete(record: ExportRecord): Promise<boolean>
}
