import { formatTime } from './format-time'

/** Every kind of space as a plain one: ICU versions differ on which space goes before AM and PM. */
const spaced = (text: string) => text.replace(/\s/g, ' ')

describe('formatTime', () => {
  it.each([
    ['en', '9:30 AM'],
    ['es', '9:30'],
    ['pt-BR', '09:30']
  ])('writes a wall-clock time in the habit of %s', (locale, written) => {
    expect(spaced(formatTime('09:30', locale))).toBe(written)
  })

  it.each([
    ['en', '11:05 PM'],
    ['es', '23:05'],
    ['pt-BR', '23:05']
  ])('writes an evening time in %s', (locale, written) => {
    expect(spaced(formatTime('23:05', locale))).toBe(written)
  })

  it('writes midnight as it is, whatever the device’s zone, since a wall-clock time has none', () => {
    expect(formatTime('00:00', 'pt-BR')).toBe('00:00')
  })
})
