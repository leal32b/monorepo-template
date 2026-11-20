import { exportLimits, type OrganizationExport } from '@repo/contracts'
import { ExportNotFoundException, ExportTooSoonException } from './data-export.errors'

/**
 * An organization's last export (ADR 0074), without its file: who asked and when, and, once the job built
 * it, when it was ready, when it expires and its size. One per organization; a new request replaces it.
 */
export type ExportRecord = {
  id: string
  organizationId: string
  requestedBy: string
  requestedAt: Date
  readyAt: Date | null
  expiresAt: Date | null
  /** In bytes. */
  size: number | null
}

const minute = 60 * 1000
const day = 24 * 60 * minute

export function newExport({
  id,
  organizationId,
  requestedBy,
  now
}: {
  id: string
  organizationId: string
  requestedBy: string
  now: Date
}): ExportRecord {
  return { id, organizationId, requestedBy, requestedAt: now, readyAt: null, expiresAt: null, size: null }
}

/** The export built now, `size` bytes, kept `exportLimits.keepDays`. */
export function readied(record: ExportRecord, { now, size }: { now: Date; size: number }): ExportRecord {
  return { ...record, readyAt: now, expiresAt: new Date(now.getTime() + exportLimits.keepDays * day), size }
}

/** When the owner may ask again, or `null` for now: `exportLimits.everyMinutes` after the last request. */
function nextRequestAt(record: ExportRecord, now: Date): Date | null {
  const next = new Date(record.requestedAt.getTime() + exportLimits.everyMinutes * minute)
  return now < next ? next : null
}

/** One request every `exportLimits.everyMinutes`, whatever became of the last one: a failed job is asked again after it. */
export function assertCanRequest(record: ExportRecord | null, now: Date): void {
  if (record !== null && nextRequestAt(record, now) !== null) throw new ExportTooSoonException()
}

/** The export as the page reads it (`organizationExportSchema`). */
export function stateOf(record: ExportRecord | null, now: Date): OrganizationExport {
  if (record === null) return { status: 'none' }
  const requestedAt = record.requestedAt.toISOString()
  const next = nextRequestAt(record, now)?.toISOString() ?? null
  const { expiresAt, size } = record
  if (expiresAt === null || size === null) return { status: 'pending', requestedAt, nextRequestAt: next }
  if (now >= expiresAt) {
    return { status: 'expired', requestedAt, expiresAt: expiresAt.toISOString(), nextRequestAt: next }
  }
  return { status: 'ready', requestedAt, expiresAt: expiresAt.toISOString(), size, nextRequestAt: next }
}

/** The export, when its file can be downloaded now: ready and not expired. */
export function downloadable(record: ExportRecord | null, now: Date): ExportRecord {
  if (record?.expiresAt == null || now >= record.expiresAt) throw new ExportNotFoundException()
  return record
}
