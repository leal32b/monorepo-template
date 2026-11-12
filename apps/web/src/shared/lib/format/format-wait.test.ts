import { formatWait } from './format-wait'

describe('formatWait', () => {
  it('says a wait under a minute in seconds, in the language', () => {
    expect(formatWait(1, 'en')).toBe('1 second')
    expect(formatWait(45, 'en')).toBe('45 seconds')
    expect(formatWait(45, 'pt-BR')).toBe('45 segundos')
  })

  it('says a longer wait in whole minutes, rounded up, so the user never comes back too soon', () => {
    expect(formatWait(60, 'en')).toBe('1 minute')
    expect(formatWait(61, 'es')).toBe('2 minutos')
    expect(formatWait(600, 'en')).toBe('10 minutes')
  })
})
