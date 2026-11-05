import { invitationFailureKind } from './invitation-failure'

const failure = (code: string | undefined) => ({ status: 400, code, requestId: undefined })

describe('invitationFailureKind', () => {
  it.each([
    ['USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION', 'alreadyMember'],
    ['ROLE_EXCEEDS_YOUR_PERMISSIONS', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION', 'notAllowed'],
    ['YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION', 'notAllowed'],
    ['INVITATION_LIMIT_REACHED', 'limit'],
    ['TOO_MANY_INVITATIONS', 'tooMany'],
    ['INVITATION_NOT_FOUND', 'gone']
  ])('names %s as %s', (code, kind) => {
    expect(invitationFailureKind(failure(code))).toBe(kind)
  })

  it('names nothing else, nor a failure without a code', () => {
    expect(invitationFailureKind(failure('INTERNAL_SERVER_ERROR'))).toBeUndefined()
    expect(invitationFailureKind(failure(undefined))).toBeUndefined()
  })
})
