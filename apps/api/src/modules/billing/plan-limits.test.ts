import { assertWithinLimit } from './plan-limits'

const refusal = (run: () => void) => {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

describe('assertWithinLimit (ADR 0063)', () => {
  it('lets one more in while the count is under the limit', () => {
    expect(refusal(() => assertWithinLimit('customers.max', 100, 99))).toBeUndefined()
  })

  it('refuses one more at the limit, naming the limit and its number', () => {
    expect(refusal(() => assertWithinLimit('customers.max', 100, 100))).toMatchObject({
      code: 'plan_limit_reached',
      entitlement: 'customers.max',
      limit: 100,
      message: "The organization's plan allows 100 of these."
    })
  })

  it('refuses one more past the limit, as after a downgrade, and deletes nothing', () => {
    expect(refusal(() => assertWithinLimit('customers.max', 100, 300))).toMatchObject({ code: 'plan_limit_reached' })
  })
})
