import type { WallClockTime } from '@repo/contracts'

/**
 * A wall-clock time (ADR 0053), such as an opening hour, in the user's 12- or 24-hour habit: "09:30" is
 * "9:30 AM" in en and "09:30" in pt-BR. It has no zone, so it is written as it is, wherever the device is.
 *
 * @public for the first module with opening hours or slots; nothing writes one yet.
 */
export function formatTime(time: WallClockTime, locale: string): string {
  const [hours, minutes] = time.split(':').map(Number) as [number, number]
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: 'UTC' }).format(
    Date.UTC(1970, 0, 1, hours, minutes)
  )
}
