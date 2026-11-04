import { memberFailureKind } from './member-failure'

const failure = (code: string | undefined) => ({ status: 400, code, requestId: undefined })

describe('memberFailureKind', () => {
  it.each([
    ['YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER', 'notAllowed'],
    ['MEMBER_OUTRANKS_YOU', 'notAllowed'],
    ['ROLE_EXCEEDS_YOUR_PERMISSIONS', 'notAllowed'],
    ['YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER', 'lastOwner'],
    ['YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER', 'lastOwner'],
    ['MEMBER_NOT_FOUND', 'gone']
  ])('names %s as %s', (code, kind) => {
    expect(memberFailureKind(failure(code))).toBe(kind)
  })

  it('names nothing else, nor a failure without a code', () => {
    expect(memberFailureKind(failure('INTERNAL_SERVER_ERROR'))).toBeUndefined()
    expect(memberFailureKind(failure(undefined))).toBeUndefined()
  })
})
