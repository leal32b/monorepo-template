import type { AuthFailure } from '#shared/api'

/** Why a change to a role was refused, in the words a screen has for it. */
export type RoleFailureKind = 'tooMany' | 'notAllowed' | 'inUse' | 'gone'

/**
 * Codes from the plugin and from our rules around it (ADR 0033): the limit of roles, the caller who may not
 * (or whose permissions fall short of the role's), a role a member or an invitation holds, and one already gone.
 */
const kinds: Record<string, RoleFailureKind> = {
  TOO_MANY_ROLES: 'tooMany',
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_A_ROLE: 'notAllowed',
  YOU_ARE_NOT_ALLOWED_TO_DELETE_A_ROLE: 'notAllowed',
  ROLE_IN_USE: 'inUse',
  ROLE_IS_ASSIGNED_TO_MEMBERS: 'inUse',
  ROLE_NOT_FOUND: 'gone'
}

export function roleFailureKind(failure: AuthFailure): RoleFailureKind | undefined {
  return failure.code === undefined ? undefined : kinds[failure.code]
}
