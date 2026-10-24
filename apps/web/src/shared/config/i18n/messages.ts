import { en, type Messages } from './locales/en'
import { ptBR } from './locales/pt-BR'

/** Every supported language. Adding one is a new file in `locales/` plus a line here. */
export const messages = {
  en,
  'pt-BR': ptBR
} satisfies Record<string, Messages>

export type Locale = keyof typeof messages
