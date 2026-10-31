import { type EmailTexts, en } from './locales/en'
import { ptBR } from './locales/pt-BR'

/** Every language an email is written in. Adding one is a new file in `locales/` plus a line here. */
export const emailTexts = {
  en,
  'pt-BR': ptBR
} satisfies Record<string, EmailTexts>

export type Locale = keyof typeof emailTexts
export type EmailKind = keyof EmailTexts
