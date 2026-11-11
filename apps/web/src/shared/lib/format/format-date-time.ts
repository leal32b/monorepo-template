/**
 * An instant as every screen of the organization's business writes it (ADR 0053): its date and time in
 * the organization's time zone, the zone named, in the user's language, as "11 de nov. de 2026, 14:30 BRT".
 * The zone is named because a member may sit in another one.
 */
export function formatDateTime(instant: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short'
  }).format(instant)
}
