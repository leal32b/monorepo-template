import type { Messages } from './locales/en'

/**
 * Every supported language, each in a file of its own that is fetched only for the user who reads
 * it. Adding one is a new file in `locales/` plus a line here.
 */
const loaders = {
  en: () => import('./locales/en').then((module) => module.en),
  es: () => import('./locales/es').then((module) => module.es),
  'pt-BR': () => import('./locales/pt-BR').then((module) => module.ptBR)
} satisfies Record<string, () => Promise<Messages>>

export type Locale = keyof typeof loaders

export const locales = Object.keys(loaders) as Locale[]

const loaded: Partial<Record<Locale, Messages>> = {}

/** Fetches a language, once. The app waits for it before it shows any text. */
export async function loadMessages(locale: Locale): Promise<void> {
  loaded[locale] ??= await loaders[locale]()
}

export function getMessages(locale: Locale): Messages {
  const messages = loaded[locale]
  if (!messages) throw new Error(`The messages for ${locale} are not loaded`)
  return messages
}
