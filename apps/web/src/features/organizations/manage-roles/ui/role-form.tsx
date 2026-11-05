import { type Action, can, type Permissions, type Resource } from '@repo/contracts'
import { Button, Field, Fieldset, FormActions } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Role } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { roleFailureKind } from '../model/role-failure'
import { validateRole } from '../model/validate-role'
import { ownerOnly, PermissionGrid } from './permission-grid'

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

/**
 * Creates a role or edits one (`RoleView` only shows one), in the same grid. A permission the caller
 * does not hold, and the one only the owner has, stay in the grid, disabled and saying why. A name that
 * members or invitations hold is shown read only, its hint saying why. The name and
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
  const blocked = (resource: Resource, action: string) =>
    ownerOnly(resource, action)
      ? t('organizationRoles.form.ownerOnly')
      : holds(resource, action)
        ? undefined
        : t('organizationRoles.form.notHeld')

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
        description={t(props.nameLocked ? 'organizationRoles.form.renameLocked' : 'organizationRoles.form.nameHint')}
        value={name()}
        onChange={setName}
        error={nameError()}
      />
      <Fieldset label={t('organizationRoles.form.permissions')} error={permissionsError()}>
        <PermissionGrid checked={checked} onToggle={toggle} blocked={blocked} />
      </Fieldset>
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {t(props.role === undefined ? 'organizationRoles.form.create' : 'organizationRoles.form.save')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
