/**
 * A date as every screen writes it, in the user's language: "Nov 11, 2026", "11 de nov. de 2026".
 * One format, so the same date never reads two ways on two screens. A date of the organization's
 * business (a trial's end, a payment due) is the day it is in the organization's time zone (ADR 0053);
 * without one, the device's.
 */
export function formatDate(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...(timeZone !== undefined && { timeZone }) }).format(
    date
  )
}
