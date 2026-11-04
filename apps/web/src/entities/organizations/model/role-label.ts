import { builtInRoles } from '@repo/contracts'
import { useI18n } from '#shared/config'

/**
 * How a role is named on screen: the three built-in roles in the user's language, an organization's own
 * role by the name it was given, its first letter a capital as the built-in ones have ("Editor"), so the
 * two kinds read alike side by side. The name itself, in a field, stays as it is stored.
 */
export function useRoleLabel(): (role: string) => string {
  const { t } = useI18n()
  return (role) =>
    Object.hasOwn(builtInRoles, role)
      ? t(`organizationMembers.roles.${role as 'owner'}`)
      : role.charAt(0).toUpperCase() + role.slice(1)
}
