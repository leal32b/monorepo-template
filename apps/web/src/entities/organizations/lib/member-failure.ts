import type { AuthFailure } from '#shared/api'

/** Why a change to a membership was refused, in the words a screen has for it. */
export type MemberFailureKind = 'notAllowed' | 'lastOwner' | 'gone'

/**
 * Codes from the plugin and from our rules around it (ADR 0033) that mean the caller may not do this with
 * this person (their role changed, or the person holds more than they do), that it would leave the
 * organization without an owner (D7), or that the person is already gone. Anything else is not named here.
 */
const kinds: Record<string, MemberFailureKind> = {
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: 'notAllowed',
  MEMBER_OUTRANKS_YOU: 'notAllowed',
  ROLE_EXCEEDS_YOUR_PERMISSIONS: 'notAllowed',
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: 'lastOwner',
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: 'lastOwner',
  MEMBER_NOT_FOUND: 'gone'
}

export function memberFailureKind(failure: AuthFailure): MemberFailureKind | undefined {
  return failure.code === undefined ? undefined : kinds[failure.code]
}
