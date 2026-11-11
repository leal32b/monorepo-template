import * as z from 'zod/mini'

/**
 * The currencies offered, each with its ISO 4217 minor digits (ADR 0053): held here, not read from the
 * runtime's ICU data, so the API and the web agree on what an amount means. A product adds a code here.
 */
export const currencies = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  BRL: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
  MXN: 2,
  ARS: 2,
  CLP: 0,
  COP: 2,
  CHF: 2
} as const satisfies Record<string, number>

export type Currency = keyof typeof currencies

/** An ISO 4217 code from the currencies offered. */
export const currencySchema = z.enum(Object.keys(currencies) as [Currency, ...Currency[]])

/** How many minor units make one major unit's digits: 2 for cents, 0 for yen. */
export function minorDigitsOf(currency: Currency): number {
  return currencies[currency]
}

/**
 * Money (ADR 0053): `amount` is a safe integer in the currency's minor units, so `{ amount: 1250,
 * currency: 'BRL' }` is R$ 12,50. It always carries its currency; never a float, never major units.
 */
export const moneySchema = z.object({
  amount: z.int(),
  currency: currencySchema
})

export type Money = z.infer<typeof moneySchema>
