import { builtInRoles, type Permissions, roleNameSchema } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type RoleNameProblem = 'nameRequired' | 'nameInvalid' | 'nameBuiltIn' | 'nameTaken'
export type RoleProblems = { name: RoleNameProblem; permissions: 'noPermission' }
export type RoleValues = { name: string; permission: Record<string, string[]> }

/**
 * The role the API will accept (`roleNameSchema`, at least one permission), or what to fix, before anything is
 * sent. Spaces around the name and capitals are cleaned rather than refused. `taken` holds the names the
 * organization already has, and the ones the API said were taken, in lower case.
 */
export function validateRole(
  input: { name: string; permissions: Permissions },
  taken: ReadonlySet<string>
): Checked<RoleValues, RoleProblems> {
  const name = input.name.trim().toLowerCase()
  const permission = Object.fromEntries(
    Object.entries(input.permissions).filter(([, actions]) => actions !== undefined && actions.length > 0)
  ) as Record<string, string[]>

  const nameProblem: RoleNameProblem | undefined =
    name === ''
      ? 'nameRequired'
      : Object.hasOwn(builtInRoles, name)
        ? 'nameBuiltIn'
        : taken.has(name)
          ? 'nameTaken'
          : roleNameSchema.safeParse(name).success
            ? undefined
            : 'nameInvalid'
  const permissionsProblem = Object.keys(permission).length === 0 ? ('noPermission' as const) : undefined

  if (nameProblem === undefined && permissionsProblem === undefined) return { ok: true, values: { name, permission } }
  return {
    ok: false,
    problems: {
      ...(nameProblem && { name: nameProblem }),
      ...(permissionsProblem && { permissions: permissionsProblem })
    } as RoleProblems
  }
}
