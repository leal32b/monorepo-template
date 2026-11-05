import { Button, FormActions } from '@repo/ui'
import type { Role } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { PermissionGrid } from './permission-grid'

export type RoleViewProps = {
  role: Role
  onClose: () => void
}

/**
 * What a role may do, in the grid the role form uses, read only: for a built-in role, or one the caller
 * may not change (the row says why). Nothing here is a control, so it takes no more than a way out.
 */
export function RoleView(props: RoleViewProps) {
  const { t } = useI18n()
  const granted = (resource: string, action: string) =>
    ((props.role.permissions as Record<string, readonly string[] | undefined>)[resource] ?? []).includes(action)

  return (
    <div class="flex flex-col gap-4">
      <PermissionGrid checked={granted} />
      <FormActions>
        <Button variant="ghost" onClick={props.onClose}>
          {t('organizationRoles.form.close')}
        </Button>
      </FormActions>
    </div>
  )
}
