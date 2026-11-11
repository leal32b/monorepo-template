import { calendarDateSchema, instantSchema, timeZoneSchema, wallClockTimeSchema } from './time'

describe('instantSchema', () => {
  it.each(['2026-11-11T17:30:00Z', '2026-11-11T17:30:00.123Z'])('accepts %j, in UTC', (instant) => {
    expect(instantSchema.safeParse(instant).success).toBe(true)
  })

  it.each(['2026-11-11T14:30:00-03:00', '2026-11-11T17:30:00', '2026-11-11', 'yesterday'])(
    'refuses %j, which is not UTC with its Z',
    (instant) => {
      expect(instantSchema.safeParse(instant).success).toBe(false)
    }
  )
})

describe('calendarDateSchema', () => {
  it.each(['2026-11-11', '2028-02-29'])('accepts %j', (date) => {
    expect(calendarDateSchema.safeParse(date).success).toBe(true)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-11-11T00:00:00Z', '11/11/2026', '2026-1-1'])('refuses %j', (date) => {
    expect(calendarDateSchema.safeParse(date).success).toBe(false)
  })
})

describe('wallClockTimeSchema', () => {
  it.each(['00:00', '09:30', '23:59'])('accepts %j', (time) => {
    expect(wallClockTimeSchema.safeParse(time).success).toBe(true)
  })

  it.each(['24:00', '9:30', '09:60', '09:30:00', '09:30Z', '9am'])('refuses %j', (time) => {
    expect(wallClockTimeSchema.safeParse(time).success).toBe(false)
  })
})

describe('timeZoneSchema', () => {
  it.each(['UTC', 'America/Sao_Paulo', 'Europe/Lisbon', 'America/Argentina/Buenos_Aires', 'Etc/GMT+3'])(
    'accepts the IANA name %j',
    (zone) => {
      expect(timeZoneSchema.safeParse(zone).success).toBe(true)
    }
  )

  it.each(['Mars/Olympus_Mons', '+01:00', '-03:00', '', 'America/Sao Paulo', 'local'])('refuses %j', (zone) => {
    expect(timeZoneSchema.safeParse(zone).success).toBe(false)
  })
})
