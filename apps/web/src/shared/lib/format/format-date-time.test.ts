import { formatDateTime } from './format-date-time'

/** Every kind of space as a plain one: ICU versions differ on which space goes before AM and PM. */
const spaced = (text: string) => text.replace(/\s/g, ' ')

const instant = new Date('2026-11-11T17:30:00Z')

describe('formatDateTime', () => {
  it.each([
    ['en', 'Nov 11, 2026, 2:30 PM GMT-3'],
    ['es', '11 nov 2026, 14:30 GMT-3'],
    ['pt-BR', '11 de nov. de 2026, 14:30 BRT']
  ])('writes an instant in the organization’s zone, the zone named, in %s', (locale, written) => {
    expect(spaced(formatDateTime(instant, 'America/Sao_Paulo', locale))).toBe(written)
  })

  it('writes the same instant as another day in a zone where it is already past midnight', () => {
    expect(spaced(formatDateTime(new Date('2026-11-11T23:30:00Z'), 'Asia/Tokyo', 'en'))).toBe(
      'Nov 12, 2026, 8:30 AM GMT+9'
    )
  })
})
