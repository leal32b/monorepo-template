import type { CsvValue } from '#libs/archive/csv'

/** A column's name as a CSV header: `createdAt` and `created_at` both read `created_at`. */
export const headerOf = (column: string) => column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

/** A value as Postgres returned it, as a cell: a list (an entry's fields) is one cell, its items joined. */
export const cellOf = (value: unknown): CsvValue => (Array.isArray(value) ? value.join(', ') : (value as CsvValue))
