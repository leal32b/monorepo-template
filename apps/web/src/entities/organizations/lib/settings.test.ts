import { currencies } from '@repo/contracts'
import {
  currencyName,
  currencyOptions,
  defaultCurrency,
  defaultTimeZone,
  timeZoneLabel,
  timeZoneOptions
} from './settings'

describe('defaultTimeZone', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('takes the browser’s time zone', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'America/Sao_Paulo'
    } as Intl.ResolvedDateTimeFormatOptions)

    expect(defaultTimeZone()).toBe('America/Sao_Paulo')
  })

  it('falls back to UTC when the browser reports a zone the API would refuse', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: '+05:30'
    } as Intl.ResolvedDateTimeFormatOptions)

    expect(defaultTimeZone()).toBe('UTC')
  })
})

describe('defaultCurrency', () => {
  it.each([
    ['pt-BR', 'BRL'],
    ['pt', 'BRL'],
    ['en-US', 'USD'],
    ['en-GB', 'GBP'],
    ['de-DE', 'EUR'],
    ['es', 'EUR'],
    ['es-MX', 'MXN'],
    ['es-AR', 'ARS'],
    ['ja', 'JPY']
  ])('guesses the currency of the region of %s', (language, currency) => {
    expect(defaultCurrency(language)).toBe(currency)
  })

  it.each([
    ['a region whose currency is not offered', 'hi-IN'],
    ['a language with no region known', 'zz'],
    ['a tag that is not a language', 'not a tag!']
  ])('falls back to USD for %s', (_case, language) => {
    expect(defaultCurrency(language)).toBe('USD')
  })
})

describe('timeZoneOptions', () => {
  it('offers the browser’s zones, labelled without underscores, in order', () => {
    const options = timeZoneOptions('UTC')

    expect(options).toContainEqual({ value: 'America/Sao_Paulo', label: 'America/Sao Paulo' })
    expect(options.map((option) => option.value)).toEqual([...options.map((option) => option.value)].sort())
  })

  it('keeps UTC and the current zone even when the browser does not list them', () => {
    vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['Europe/Lisbon'])

    expect(timeZoneOptions('Asia/Calcutta').map((option) => option.value)).toEqual([
      'Asia/Calcutta',
      'Europe/Lisbon',
      'UTC'
    ])
    vi.restoreAllMocks()
  })
})

describe('timeZoneLabel', () => {
  it('writes a zone with spaces for its underscores', () => {
    expect(timeZoneLabel('America/Argentina/Buenos_Aires')).toBe('America/Argentina/Buenos Aires')
  })
})

describe('currencyName and currencyOptions', () => {
  it.each([
    ['en', 'Brazilian Real (BRL)'],
    ['es', 'Real brasileño (BRL)'],
    ['pt-BR', 'Real brasileiro (BRL)']
  ])('names a currency in the reader’s language, with its code, in %s', (locale, name) => {
    expect(currencyName('BRL', locale)).toBe(name)
  })

  it('offers every currency of the contracts', () => {
    expect(currencyOptions('en').map((option) => option.value)).toEqual(Object.keys(currencies))
    expect(currencyOptions('en')).toContainEqual({ value: 'JPY', label: 'Japanese Yen (JPY)' })
  })
})
