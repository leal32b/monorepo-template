/** A number of days, as "12 days" or "1 dia": the language's own word and plural, from `Intl`. */
export function formatDays(days: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(days)
}
