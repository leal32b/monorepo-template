import { type Currency, currencySchema, timeZoneSchema } from '@repo/contracts'

/** A choice of a select: the stored value and what the reader sees. */
type Option<T extends string> = { value: T; label: string }

/** The browser's time zone, the default of a new organization (ADR 0053); UTC if the API would refuse it. */
export function defaultTimeZone(): string {
  const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone
  return timeZoneSchema.safeParse(zone).success ? zone : 'UTC'
}

/** Regions that use the euro, besides the ones whose own currency is offered. */
const euroRegions = new Set(
  'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ') as readonly string[]
)

/** The currency of the regions whose own currency is offered, by ISO 3166 code. */
const regionCurrency: Readonly<Record<string, Currency>> = {
  US: 'USD',
  GB: 'GBP',
  BR: 'BRL',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  MX: 'MXN',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  CH: 'CHF'
}

/**
 * The currency a new organization most likely uses, guessed from the region of the browser's language
 * (`pt-BR` and `pt` give BRL, `de-DE` gives EUR); USD when the region is unknown or its currency not offered.
 */
export function defaultCurrency(language: string): Currency {
  let region: string | undefined
  try {
    region = new Intl.Locale(language).maximize().region
  } catch {
    return 'USD'
  }
  if (region === undefined) return 'USD'
  if (euroRegions.has(region)) return 'EUR'
  return regionCurrency[region] ?? 'USD'
}

/** A time zone as a reader sees it: its IANA name, with spaces for underscores. */
export function timeZoneLabel(zone: string): string {
  return zone.replaceAll('_', ' ')
}

/**
 * The zones this browser knows, in order, and always UTC and the current one: another browser may have
 * saved a zone this one does not list, and the select must still show it.
 */
export function timeZoneOptions(current: string): Option<string>[] {
  const zones = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC', current])
  return [...zones].sort().map((zone) => ({ value: zone, label: timeZoneLabel(zone) }))
}

/** A currency in the reader's language, with its code: "Real brasileiro (BRL)". */
export function currencyName(currency: Currency, locale: string): string {
  const name = new Intl.DisplayNames(locale, { type: 'currency' }).of(currency) as string
  return `${name.charAt(0).toLocaleUpperCase(locale)}${name.slice(1)} (${currency})`
}

/** The currencies offered by the contracts, named in the reader's language. */
export function currencyOptions(locale: string): Option<Currency>[] {
  return currencySchema.options.map((currency) => ({ value: currency, label: currencyName(currency, locale) }))
}
