import { formatDays } from './format-days'

describe('formatDays', () => {
  it('writes a number of days with the language’s own word and plural', () => {
    expect(formatDays(1, 'en')).toBe('1 day')
    expect(formatDays(12, 'en')).toBe('12 days')
    expect(formatDays(1, 'pt-BR')).toBe('1 dia')
    expect(formatDays(12, 'es')).toBe('12 días')
  })
})
