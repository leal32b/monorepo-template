import type { Locale } from './locales'

/**
 * The day of `instant` as the recipient reads it (ADR 0053, ADR 0073): in their language, on the
 * organization's calendar. A text names the day only, never a time without its zone.
 */
export function formatDay(instant: Date, { locale, timeZone }: { locale: Locale; timeZone: string }): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone }).format(instant)
}
