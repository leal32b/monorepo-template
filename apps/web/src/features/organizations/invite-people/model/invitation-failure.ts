import type { AuthFailure } from '#shared/api'

/** Why a change to an invitation was refused, in the words a screen has for it. */
export type InvitationFailureKind = 'alreadyMember' | 'notAllowed' | 'limit' | 'tooMany' | 'gone'

/**
 * Codes from the plugin and from our rules around it (ADR 0033): the person is already in, the caller may
 * not invite with this role (or has lost the right to), the pending invitations are at their limit, the
 * inviter sent too many in a minute (D6), or the invitation is no longer pending.
 */
const kinds: Record<string, InvitationFailureKind> = {
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: 'alreadyMember',
  ROLE_EXCEEDS_YOUR_PERMISSIONS: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: 'notAllowed',
  INVITATION_LIMIT_REACHED: 'limit',
  TOO_MANY_INVITATIONS: 'tooMany',
  INVITATION_NOT_FOUND: 'gone'
}

export function invitationFailureKind(failure: AuthFailure): InvitationFailureKind | undefined {
  return failure.code === undefined ? undefined : kinds[failure.code]
}
