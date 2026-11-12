/**
 * How long to wait before trying again, as a rate limit's `retryAfter` gives it in seconds (ADR 0059):
 * seconds under a minute, else whole minutes rounded up, so the user never comes back too soon. The
 * language's own words and plurals, from `Intl`.
 */
export function formatWait(seconds: number, locale: string): string {
  const [value, unit] = seconds < 60 ? [seconds, 'second'] : [Math.ceil(seconds / 60), 'minute']
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
}
