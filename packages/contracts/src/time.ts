import * as z from 'zod/mini'

/** A moment (ADR 0053): ISO 8601 in UTC, with its `Z`, as `2026-11-11T17:30:00Z`. Drawn in a time zone. */
export const instantSchema = z.iso.datetime()

/** A day that is the same everywhere (a birthday, a due date): `YYYY-MM-DD`, with no zone; never a `Date`. */
export const calendarDateSchema = z.iso.date()

export type CalendarDate = z.infer<typeof calendarDateSchema>

/** A time of day with no day and no zone (opening hours, a recurring slot): `HH:MM`, 24-hour. */
export const wallClockTimeSchema = z.iso.time({ precision: -1 })

export type WallClockTime = z.infer<typeof wallClockTimeSchema>

/** `Area/Location` names of the IANA database, and `UTC`; offsets such as `+01:00` are not zones. */
const ianaName = /^(?:UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/

/** Whether this runtime's time zone data knows `zone`. */
const isKnownZone = (zone: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** An IANA time zone this runtime knows, as `America/Sao_Paulo`. */
export const timeZoneSchema = z.string().check(z.regex(ianaName), z.refine(isKnownZone))

export type TimeZone = z.infer<typeof timeZoneSchema>
