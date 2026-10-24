import type { Locale } from './messages'

/** The first supported language of the browser's preference list; English when none is. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split('-')[0]
    if (primary === 'pt') return 'pt-BR'
    if (primary === 'en') return 'en'
  }
  return 'en'
}
