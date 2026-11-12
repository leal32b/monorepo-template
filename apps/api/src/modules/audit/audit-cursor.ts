import type { AuditCursor } from '#libs/ports/audit-trail.port'

/** An ISO 8601 instant as `toISOString` writes it, so a cursor reads back to the same millisecond. */
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * Where the next page of the trail starts, as text for the web to send back (ADR 0061): the last
 * entry's instant and id, base64url so it reads as one opaque word in a query string.
 */
export function encodeCursor(cursor: AuditCursor): string {
  return Buffer.from(`${cursor.at.toISOString()}|${cursor.id}`).toString('base64url')
}

/** The cursor a text holds, or null when it is not one this API wrote. */
export function decodeCursor(text: string): AuditCursor | null {
  const decoded = Buffer.from(text, 'base64url').toString()
  const separator = decoded.indexOf('|')
  const at = decoded.slice(0, separator)
  const id = decoded.slice(separator + 1)
  if (separator < 0 || !instant.test(at) || id === '') return null
  return { at: new Date(at), id }
}
