import { builtInRoles } from '@repo/contracts'
import { useI18n } from '#shared/config'

/**
 * How a role is named on screen: the three built-in roles in the user's language, an organization's own
 * role by the name it was given.
 */
export function useRoleLabel(): (role: string) => string {
  const { t } = useI18n()
  return (role) => (Object.hasOwn(builtInRoles, role) ? t(`organizationMembers.roles.${role as 'owner'}`) : role)
}
