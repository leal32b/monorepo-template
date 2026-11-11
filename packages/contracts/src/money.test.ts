import { currencies, currencySchema, minorDigitsOf, moneySchema } from './money'

describe('currencies', () => {
  it('gives each currency offered its ISO 4217 minor digits', () => {
    expect(currencies.USD).toBe(2)
    expect(currencies.BRL).toBe(2)
    expect(currencies.JPY).toBe(0)
    expect(currencies.CLP).toBe(0)
  })

  it('says how many minor digits a currency has', () => {
    expect(minorDigitsOf('EUR')).toBe(2)
    expect(minorDigitsOf('JPY')).toBe(0)
  })
})

describe('currencySchema', () => {
  it('accepts a currency offered', () => {
    expect(currencySchema.safeParse('BRL').success).toBe(true)
  })

  it.each(['brl', 'XXX', 'BTC', '', 'US'])('refuses %j', (code) => {
    expect(currencySchema.safeParse(code).success).toBe(false)
  })
})

describe('moneySchema', () => {
  it('accepts an integer amount in minor units with its currency', () => {
    expect(moneySchema.parse({ amount: 1250, currency: 'BRL' })).toEqual({ amount: 1250, currency: 'BRL' })
  })

  it('accepts a negative amount, such as a refund', () => {
    expect(moneySchema.safeParse({ amount: -500, currency: 'USD' }).success).toBe(true)
  })

  it.each([
    ['a fraction', { amount: 12.5, currency: 'USD' }],
    ['an amount past the safe integers', { amount: 2 ** 53, currency: 'USD' }],
    ['a decimal string', { amount: '12.50', currency: 'USD' }],
    ['no currency', { amount: 1250 }],
    ['a currency not offered', { amount: 1250, currency: 'XXX' }]
  ])('refuses %s', (_, money) => {
    expect(moneySchema.safeParse(money).success).toBe(false)
  })
})
