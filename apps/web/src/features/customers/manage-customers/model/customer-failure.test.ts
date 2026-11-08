import { customerFailureKind } from './customer-failure'

const failure = (code: string | undefined, status: number | undefined = 409) => ({ status, code, requestId: undefined })

describe('customerFailureKind', () => {
  it.each([
    ['customer_email_taken', 'emailTaken'],
    ['customer_not_found', 'gone'],
    ['customer_changed', 'changed'],
    ['customer_already_archived', 'changed'],
    ['customer_not_archived', 'changed'],
    ['permission_denied', 'notAllowed'],
    ['organization_not_found', 'notAllowed']
  ])('reads %s as %s', (code, kind) => {
    expect(customerFailureKind(failure(code))).toBe(kind)
  })

  it('has no words for what it does not know, nor for a call that did not reach the API', () => {
    expect(customerFailureKind(failure('something_else'))).toBeUndefined()
    expect(customerFailureKind(failure(undefined))).toBeUndefined()
    expect(customerFailureKind(failure(undefined, undefined))).toBeUndefined()
  })
})
