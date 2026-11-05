import { builtInRoles, permissionsSchema } from '@repo/contracts'
import { ApiError, type AuthClient } from '#shared/api'
import type { Role } from '../lib/members'

/** The rows Better Auth sends for `list-roles`: the organization's own roles, with their permissions parsed. */
type Row = { role: string; permission: unknown }

const builtIn: Role[] = (Object.keys(builtInRoles) as (keyof typeof builtInRoles)[]).map((name) => ({
  name,
  permissions: builtInRoles[name],
  builtIn: true
}))

/**
 * The roles an organization can give: the three built in, then its own. A stored role that is not a valid set
 * of permissions grants nothing, as in the API. Anyone who may read roles (`ac:read`, which every built-in
 * role holds) can list them. Fails like any call, with an `ApiError`.
 */
export async function listRoles(auth: AuthClient, organizationId: string): Promise<Role[]> {
  let answer: Awaited<ReturnType<AuthClient['organization']['listRoles']>>
  try {
    answer = await auth.organization.listRoles({ query: { organizationId } })
  } catch (cause) {
    throw new ApiError('network', 'The roles could not be read.', { cause })
  }
  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  const custom = (answer.data as unknown as Row[]).map((row) => {
    const parsed = permissionsSchema.safeParse(row.permission)
    return { name: row.role, permissions: parsed.success ? parsed.data : {}, builtIn: false }
  })
  return [...builtIn, ...custom]
}
