/** What a cell holds: the adapter turns anything else (a list, an amount with its currency) into one of these. */
export type CsvValue = string | number | boolean | Date | null

/** A value a spreadsheet would run as a formula (OWASP's CSV injection); a phone or a signed number is not one. */
const formula = /^[=@\t\r]|^[+-](?![\d\s().-]*$)/

/** A value that must be quoted to stay one cell (RFC 4180), or that a spreadsheet would trim. */
const needsQuotes = /[",\r\n]|^\s|\s$/

function cell(value: CsvValue): string {
  if (value === null) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  const safe = typeof value === 'string' && formula.test(text) ? `'${text}` : text
  return needsQuotes.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/**
 * One table as CSV (ADR 0074): a header of column names, then a line per row, RFC 4180 quoting and CRLF,
 * with a byte-order mark so a spreadsheet reads UTF-8 accents right. A text that would run as a formula in a
 * spreadsheet starts with `'`, so a value a visitor typed cannot become one (T61).
 */
export function toCsv(columns: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return `﻿${[columns, ...rows].map((row) => `${row.map(cell).join(',')}\r\n`).join('')}`
}
