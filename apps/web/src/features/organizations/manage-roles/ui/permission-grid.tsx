import { type Action, type Resource, statements } from '@repo/contracts'
import { Checkbox, CheckboxGroup } from '@repo/ui'
import { For } from 'solid-js'
import { useI18n } from '#shared/config'

type PermissionKey = {
  [R in Resource]: `organizationRoles.permissions.${R}.${Action<R>}`
}[Resource]

const resources = Object.keys(statements) as Resource[]

/** The permissions only the owner has: no role of an organization's own may hold them (ADR 0033, D3). */
export const ownerOnly = (resource: Resource, action: string) => resource === 'organization' && action === 'delete'

export type PermissionGridProps = {
  /** Whether the role holds a permission. */
  checked: (resource: Resource, action: string) => boolean
  /** Changes one permission; without it the grid only shows the role (`readOnly`). */
  onToggle?: ((resource: Resource, action: string, on: boolean) => void) | undefined
  /** Why a permission cannot be given here, if it cannot: the reason shows under it, and it is disabled. */
  blocked?: ((resource: Resource, action: string) => string | undefined) | undefined
}

/**
 * Every permission there is, a group per resource, two columns from `sm` up: the one way a role's
 * permissions are shown, to edit them or only to see them. To see them, the checkboxes are read only,
 * at full strength; to edit, the ones that cannot be given are disabled with the reason.
 */
export function PermissionGrid(props: PermissionGridProps) {
  const { t } = useI18n()

  return (
    <div class="grid gap-3 sm:grid-cols-2">
      <For each={resources}>
        {(resource) => (
          <CheckboxGroup label={t(`organizationRoles.resources.${resource}`)}>
            <For each={statements[resource] as readonly string[]}>
              {(action) => {
                const reason = () => props.blocked?.(resource, action)
                return (
                  <Checkbox
                    name={`${resource}:${action}`}
                    label={t(`organizationRoles.permissions.${resource}.${action}` as PermissionKey)}
                    description={reason()}
                    checked={props.checked(resource, action)}
                    onChange={(on) => props.onToggle?.(resource, action, on)}
                    readOnly={props.onToggle === undefined}
                    disabled={reason() !== undefined}
                  />
                )
              }}
            </For>
          </CheckboxGroup>
        )}
      </For>
    </div>
  )
}
