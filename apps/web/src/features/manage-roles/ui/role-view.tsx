import { type Action, type Resource, statements } from '@repo/contracts'
import { Button, Icon } from '@repo/ui'
import { For, Show } from 'solid-js'
import { type Role, useRoleLabel } from '#entities/organizations'
import { useI18n } from '#shared/config'

export type RoleViewProps = {
  role: Role
  /** Why the role cannot be changed here, said first. */
  reason?: string | undefined
  onClose: () => void
}

type PermissionKey = {
  [R in Resource]: `organizationRoles.permissions.${R}.${Action<R>}`
}[Resource]

const resources = Object.keys(statements) as Resource[]

/**
 * What a role may do, as a list of what it grants, a group per resource: for a built-in role, or one the
 * caller may not change. Nothing here is a control, so it takes no more than the role and a way out.
 */
export function RoleView(props: RoleViewProps) {
  const { t } = useI18n()
  const label = useRoleLabel()
  const granted = (resource: Resource) => (props.role.permissions[resource] ?? []) as readonly string[]
  const none = () => resources.every((resource) => granted(resource).length === 0)

  return (
    <div class="flex flex-col gap-4">
      <Show when={props.reason}>
        <p class="text-muted-foreground">{props.reason}</p>
      </Show>
      <p class="font-medium">{label(props.role.name)}</p>
      <Show when={none()}>
        <p class="text-muted-foreground">{t('organizationRoles.view.none')}</p>
      </Show>
      <div class="grid gap-3 sm:grid-cols-2">
        <For each={resources}>
          {(resource) => (
            <Show when={granted(resource).length > 0}>
              <section
                aria-label={t(`organizationRoles.resources.${resource}`)}
                class="flex min-w-0 flex-col gap-1.5 rounded-md border border-border-subtle bg-background px-3 py-2"
              >
                <h4 class="m-0 text-sm font-medium">{t(`organizationRoles.resources.${resource}`)}</h4>
                <ul class="m-0 flex list-none flex-col gap-1 p-0">
                  <For each={granted(resource)}>
                    {(action) => (
                      <li class="flex items-start gap-2 text-base sm:text-sm">
                        <Icon name="check" class="mt-0.5 shrink-0 text-muted-foreground" />
                        {t(`organizationRoles.permissions.${resource}.${action}` as PermissionKey)}
                      </li>
                    )}
                  </For>
                </ul>
              </section>
            </Show>
          )}
        </For>
      </div>
      <Button variant="ghost" class="w-full sm:w-auto sm:self-start" onClick={props.onClose}>
        {t('organizationRoles.form.close')}
      </Button>
    </div>
  )
}
