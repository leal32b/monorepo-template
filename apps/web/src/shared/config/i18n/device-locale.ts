import { readStored } from '../device/device-storage'
import { type Locale, locales } from './messages'

/** The key the chosen language is kept under on this device (ADR 0028). */
export const localeKey = 'locale'

/** The language chosen on this device, if it is one the app has. */
export function readDeviceLocale(): Locale | undefined {
  const stored = readStored(localeKey)
  return locales.find((locale) => locale === stored)
}
