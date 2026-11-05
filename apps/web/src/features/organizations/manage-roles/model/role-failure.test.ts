import { roleFailureKind } from './role-failure'

const failure = (code: string | undefined) => ({ status: 400, code, requestId: undefined })

describe('roleFailureKind', () => {
  it.each([
    ['TOO_MANY_ROLES', 'tooMany'],
    ['YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_UPDATE_A_ROLE', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_DELETE_A_ROLE', 'notAllowed'],
    ['ROLE_IN_USE', 'inUse'],
    ['ROLE_IS_ASSIGNED_TO_MEMBERS', 'inUse'],
    ['ROLE_NOT_FOUND', 'gone']
  ])('names %s as %s', (code, kind) => {
    expect(roleFailureKind(failure(code))).toBe(kind)
  })

  it('names nothing else, nor a failure without a code', () => {
    expect(roleFailureKind(failure('INTERNAL_SERVER_ERROR'))).toBeUndefined()
    expect(roleFailureKind(failure(undefined))).toBeUndefined()
  })
})
