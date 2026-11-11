import { formatMoney } from './format-money'

/** Every kind of space as a plain one: ICU versions differ on which space goes beside a symbol. */
const spaced = (text: string) => text.replace(/\s/g, ' ')

describe('formatMoney', () => {
  it.each([
    ['en', 'R$1,234.56'],
    ['es', '1234,56 BRL'],
    ['pt-BR', 'R$ 1.234,56']
  ])('writes minor units as the amount with its currency in %s', (locale, written) => {
    expect(spaced(formatMoney({ amount: 123456, currency: 'BRL' }, locale))).toBe(written)
  })

  it('writes every minor digit of the currency, even when they are zero', () => {
    expect(formatMoney({ amount: 500, currency: 'USD' }, 'en')).toBe('$5.00')
  })

  it('writes a currency without minor units as whole units', () => {
    expect(formatMoney({ amount: 1500, currency: 'JPY' }, 'en')).toBe('¥1,500')
  })

  it('writes a negative amount and an amount under one major unit', () => {
    expect(spaced(formatMoney({ amount: -5, currency: 'EUR' }, 'pt-BR'))).toBe('-€ 0,05')
  })

  it('keeps every digit of the largest safe amount, which a division would round', () => {
    expect(formatMoney({ amount: Number.MAX_SAFE_INTEGER, currency: 'USD' }, 'en')).toBe('$90,071,992,547,409.91')
  })
})
