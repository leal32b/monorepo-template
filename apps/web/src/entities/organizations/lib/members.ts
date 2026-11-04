import { type Permissions, statements } from '@repo/contracts'

/** A role of an organization: one of the three built in, or one of its own with the permissions it grants. */
export type Role = { name: string; permissions: Permissions; builtIn: boolean }

/** A person in an organization, with the roles they hold there. */
export type Member = {
  /** Better Auth's member id: the key of every change to the membership. */
  id: string
  userId: string
  name: string
  email: string
  roles: string[]
  createdAt: Date
}

/** The role names Better Auth stores for a member, comma-separated. */
export const rolesOf = (stored: string): string[] => stored.split(',').map((role) => role.trim())

/** What `names` hold together: the union of their roles' permissions. A name that is no role grants nothing. */
export function permissionsOfRoles(names: readonly string[], roles: readonly Role[]): Permissions {
  const held: Record<string, Set<string>> = {}
  for (const name of names) {
    const granted: Permissions = roles.find((role) => role.name === name)?.permissions ?? {}
    for (const resource of Object.keys(statements)) {
      const actions = granted[resource as keyof Permissions] as readonly string[] | undefined
      if (actions === undefined) continue
      held[resource] = new Set([...(held[resource] ?? []), ...actions])
    }
  }
  return Object.fromEntries(Object.entries(held).map(([resource, actions]) => [resource, [...actions]])) as Permissions
}

/** Whether `member` is the only owner, who can neither leave nor lose the role (D7). */
export function isLastOwner(member: Member, members: readonly Member[]): boolean {
  const owners = members.filter((candidate) => candidate.roles.includes('owner'))
  return member.roles.includes('owner') && owners.length === 1
}
