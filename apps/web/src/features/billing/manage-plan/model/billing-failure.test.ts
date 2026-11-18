import { billingFailureKind, isStale } from './billing-failure'

const failure = (code: string | undefined, status: number | undefined = 409) => ({ status, code, requestId: undefined })

describe('billingFailureKind (ADR 0067)', () => {
  it.each([
    ['subscription_changed', 'changed'],
    ['checkout_open', 'checkoutOpen'],
    ['checkout_paid', 'checkoutPaid'],
    ['subscription_not_active', 'notActive'],
    ['cancellation_scheduled', 'cancellationScheduled'],
    ['payment_overdue', 'paymentOverdue'],
    ['plan_change_not_allowed', 'wrongDirection'],
    ['service_unavailable', 'unavailable'],
    ['permission_denied', 'notAllowed'],
    ['organization_not_found', 'notAllowed']
  ])('reads %s as %s', (code, kind) => {
    expect(billingFailureKind(failure(code))).toBe(kind)
  })

  it('has no words for what it does not know, nor for a call that did not reach the API', () => {
    expect(billingFailureKind(failure('something_else'))).toBeUndefined()
    expect(billingFailureKind({ status: undefined, code: undefined, requestId: undefined })).toBeUndefined()
  })
})

describe('isStale', () => {
  it('takes every refusal of the subscription’s state as a sign the page must read it again', () => {
    expect(isStale(failure('subscription_changed'))).toBe(true)
    expect(isStale(failure('checkout_paid'))).toBe(true)
    expect(isStale(failure('service_unavailable', 503))).toBe(false)
    expect(isStale(failure('permission_denied', 403))).toBe(false)
    expect(isStale({ status: undefined, code: undefined, requestId: undefined })).toBe(false)
  })
})
