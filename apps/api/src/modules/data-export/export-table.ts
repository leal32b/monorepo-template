import type { CsvValue } from '#libs/archive/csv'

/** One file of the export (ADR 0074): its name without `.csv`, the column names, and the rows in their order. */
export type ExportTable = {
  name: string
  columns: readonly string[]
  rows: readonly (readonly CsvValue[])[]
}
