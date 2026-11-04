import { type Action, can, type Permissions, type Resource, statements } from '@repo/contracts'
import { Button, Checkbox, Field } from '@repo/ui'
import { createSignal, For, Show } from 'solid-js'
import type { Role } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { roleFailureKind } from '../model/role-failure'
import { validateRole } from '../model/validate-role'

export type RoleFormProps = {
  organizationId: string
  /** The role being edited or viewed; none to create one. */
  role?: Role | undefined
  /** The names of every role the organization has, to refuse a repeated one. */
  roles: readonly Role[]
  /** What the caller holds: a permission they do not hold cannot be given (ADR 0033). */
  held: Permissions
  /** The name cannot change because a member or an invitation holds the role. */
  nameLocked?: boolean | undefined
  /** Called with the role once it is saved. */
  onSaved: (role: Role) => void
  /** Called when the role no longer exists, so the list can be read again. */
  onGone: () => void
  onCancel: () => void
}

type PermissionKey = {
  [R in Resource]: `organizationRoles.permissions.${R}.${Action<R>}`
}[Resource]

const labelOf = (resource: Resource, action: string) =>
  `organizationRoles.permissions.${resource}.${action}` as PermissionKey

const resources = Object.keys(statements) as Resource[]
/** The permissions only the owner has: no role of an organization's own may hold them (ADR 0033, D3). */
const ownerOnly = (resource: Resource, action: string) => resource === 'organization' && action === 'delete'

/**
 * Creates a role or edits one (`RoleView` only shows one). The permissions are a grid of checkboxes, a
 * group per resource, one column on phones. A permission the caller does not hold stays in the grid,
 * disabled and saying so; the one only the owner has is left out, with a line saying why. The name and
 * the permissions are checked on submit, and again when a field is left after that.
 */
export function RoleForm(props: RoleFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [name, setName] = createSignal(props.role?.name ?? '')
  const [selected, setSelected] = createSignal<Record<string, string[]>>(
    Object.fromEntries(
      (Object.entries(props.role?.permissions ?? {}) as [string, readonly string[]][]).map(([resource, actions]) => [
        resource,
        [...actions]
      ])
    )
  )
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const taken = new Set(props.roles.filter((role) => role.name !== props.role?.name).map((role) => role.name))
  const checks = createFormChecks(() => validateRole({ name: name(), permissions: selected() as Permissions }, taken))

  const checked = (resource: Resource, action: string) => selected()[resource]?.includes(action) ?? false
  const toggle = (resource: Resource, action: string, on: boolean) =>
    setSelected((previous) => {
      const others = (previous[resource] ?? []).filter((candidate) => candidate !== action)
      return { ...previous, [resource]: on ? [...others, action] : others }
    })
  const holds = (resource: Resource, action: string) => can(props.held, resource, action as Action<typeof resource>)
  const actionsOf = (resource: Resource) =>
    (statements[resource] as readonly string[]).filter((action) => !ownerOnly(resource, action))

  const nameError = () => {
    const problem = checks.problems().name
    return problem && t(`organizationRoles.errors.${problem}`)
  }
  const permissionsError = () => {
    const problem = checks.problems().permissions
    return problem && t(`organizationRoles.errors.${problem}`)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      props.role === undefined
        ? auth.organization.createRole(
            { organizationId: props.organizationId, role: values.name, permission: values.permission },
            options
          )
        : auth.organization.updateRole(
            {
              organizationId: props.organizationId,
              roleName: props.role.name,
              data: {
                permission: values.permission,
                ...(values.name !== props.role.name && { roleName: values.name })
              }
            },
            options
          )
    )
    setPending(false)

    if (failed === undefined) {
      props.onSaved({ name: values.name, permissions: values.permission as Permissions, builtIn: false })
    } else if (failed.code === 'ROLE_NAME_IS_ALREADY_TAKEN') {
      taken.add(values.name)
      checks.submit(form)
    } else if (roleFailureKind(failed) === 'gone') {
      props.onGone()
    } else {
      setFailure(failed)
    }
  }

  const message = (failed: AuthFailure) => {
    const kind = roleFailureKind(failed)
    return kind === undefined ? undefined : t(`organizationRoles.errors.${kind as 'notAllowed'}`)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('organizationRoles.form.name')}
        name="role"
        autocomplete="off"
        autocapitalize="none"
        spellcheck={false}
        readOnly={Boolean(props.nameLocked)}
        description={t('organizationRoles.form.nameHint')}
        value={name()}
        onChange={setName}
        error={nameError()}
      />
      <Show when={props.nameLocked}>
        <p class="-mt-2 text-sm text-muted-foreground">{t('organizationRoles.form.renameLocked')}</p>
      </Show>
      <fieldset class="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend class="text-sm font-medium">{t('organizationRoles.form.permissions')}</legend>
        <div class="grid gap-3 sm:grid-cols-2">
          <For each={resources}>
            {(resource) => (
              <fieldset class="m-0 flex min-w-0 flex-col rounded-md border border-border-subtle bg-background px-3 py-2">
                <legend class="px-1 text-sm font-medium">{t(`organizationRoles.resources.${resource}`)}</legend>
                <For each={actionsOf(resource)}>
                  {(action) => (
                    <Checkbox
                      name={`${resource}:${action}`}
                      label={t(labelOf(resource, action))}
                      description={holds(resource, action) ? undefined : t('organizationRoles.form.notHeld')}
                      checked={checked(resource, action)}
                      onChange={(on) => toggle(resource, action, on)}
                      disabled={!holds(resource, action)}
                    />
                  )}
                </For>
              </fieldset>
            )}
          </For>
        </div>
        <p class="text-sm text-muted-foreground">{t('organizationRoles.form.ownerOnly')}</p>
        <Show when={permissionsError()}>
          <p role="alert" class="text-sm text-destructive">
            {permissionsError()}
          </p>
        </Show>
      </fieldset>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
          {t(props.role === undefined ? 'organizationRoles.form.create' : 'organizationRoles.form.save')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
