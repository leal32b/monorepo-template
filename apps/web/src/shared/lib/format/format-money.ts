import { type Money, minorDigitsOf } from '@repo/contracts'

/** The amount in major units as a decimal string, exact for every safe integer, where a division would round. */
function majorUnits({ amount, currency }: Money): `${number}` {
  const digits = minorDigitsOf(currency)
  const minor = BigInt(Math.abs(amount))
    .toString()
    .padStart(digits + 1, '0')
  const whole = minor.slice(0, minor.length - digits)
  const fraction = minor.slice(minor.length - digits)
  return `${amount < 0 ? '-' : ''}${whole}${digits > 0 ? `.${fraction}` : ''}` as `${number}`
}

/**
 * Money as every screen writes it (ADR 0053), in the user's language, with the currency's symbol and all
 * its minor digits: `{ amount: 123456, currency: 'BRL' }` is "R$ 1.234,56" in pt-BR, "R$1,234.56" in en.
 */
export function formatMoney(money: Money, locale: string): string {
  const digits = minorDigitsOf(money.currency)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(majorUnits(money))
}
