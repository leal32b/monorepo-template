import { formatDay } from './format'

describe('formatDay (ADR 0073)', () => {
  const lateEvening = new Date('2026-12-06T01:30:00.000Z')

  it('names the day in the organization’s time zone, not in UTC', () => {
    expect(formatDay(lateEvening, { locale: 'en', timeZone: 'America/Sao_Paulo' })).toBe('December 5, 2026')
    expect(formatDay(lateEvening, { locale: 'en', timeZone: 'UTC' })).toBe('December 6, 2026')
  })

  it('writes it in the recipient’s language', () => {
    expect(formatDay(lateEvening, { locale: 'pt-BR', timeZone: 'America/Sao_Paulo' })).toBe('5 de dezembro de 2026')
    expect(formatDay(lateEvening, { locale: 'es', timeZone: 'America/Sao_Paulo' })).toBe('5 de diciembre de 2026')
  })
})
