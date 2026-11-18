import { formatDate } from './format-date'

describe('formatDate', () => {
  it('writes a date the same way everywhere, in the user’s language', () => {
    const date = new Date('2026-11-11T12:00:00.000Z')

    expect(formatDate(date, 'en')).toBe('Nov 11, 2026')
    expect(formatDate(date, 'pt-BR')).toBe('11 de nov. de 2026')
  })

  it('writes the day it is in a time zone, for a date of the organization’s business (ADR 0053)', () => {
    const lateInLondon = new Date('2026-11-11T23:30:00.000Z')

    expect(formatDate(lateInLondon, 'en', 'Europe/London')).toBe('Nov 11, 2026')
    expect(formatDate(lateInLondon, 'en', 'Asia/Tokyo')).toBe('Nov 12, 2026')
  })
})
