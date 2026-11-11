/**
 * A date as every screen writes it, in the user's language: "Nov 11, 2026", "11 de nov. de 2026".
 * One format, so the same date never reads two ways on two screens.
 */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}
