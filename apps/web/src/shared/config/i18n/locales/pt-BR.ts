import { entryPtBR } from '../dictionaries/entry/pt-BR'
import { shellPtBR } from '../dictionaries/shell/pt-BR'
import type { en } from './en'

/** The core groups, as English has them (ADR 0071). */
export const ptBR: typeof en = {
  ...shellPtBR,
  ...entryPtBR
}
