import { detectLocale } from './detect-locale'

describe('detectLocale', () => {
  it.each([
    [['pt-BR', 'en'], 'pt-BR'],
    [['pt'], 'pt-BR'],
    [['pt-PT'], 'pt-BR'],
    [['en-US'], 'en'],
    [['en'], 'en']
  ])('picks the supported language of %j: %s', (languages, expected) => {
    expect(detectLocale(languages)).toBe(expected)
  })

  it('skips unsupported languages and uses the first supported one', () => {
    expect(detectLocale(['fr-FR', 'pt-BR'])).toBe('pt-BR')
  })

  it('falls back to English when nothing is supported or nothing is given', () => {
    expect(detectLocale(['fr', 'de'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })
})
