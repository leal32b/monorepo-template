import { entryEs } from '../dictionaries/entry/es'
import { shellEs } from '../dictionaries/shell/es'
import type { en } from './en'

/** The core groups, as English has them (ADR 0071). */
export const es: typeof en = {
  ...shellEs,
  ...entryEs
}
