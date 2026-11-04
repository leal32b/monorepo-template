import { ConfirmForm } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Role } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { roleFailureKind } from '../model/role-failure'

export type DeleteRoleFormProps = {
  organizationId: string
  role: Role
  /** Called once the role is deleted. */
  onDeleted: () => void
  /** Called when the role no longer exists, so the list can be read again. */
  onGone: () => void
  onCancel: () => void
}

/**
 * Deletes one of the organization's own roles. The screen offers it only when nobody holds the role, so
 * nobody loses access, and it asks once, in the row, saying so. The API refuses it too if somebody was
 * given the role meanwhile.
 */
export function DeleteRoleForm(props: DeleteRoleFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.deleteRole({ organizationId: props.organizationId, roleName: props.role.name }, options)
    )
    setPending(false)
    if (failed === undefined) props.onDeleted()
    else if (roleFailureKind(failed) === 'gone') props.onGone()
    else setFailure(failed)
  }

  const message = (failed: AuthFailure) => {
    const kind = roleFailureKind(failed)
    return kind === undefined ? undefined : t(`organizationRoles.errors.${kind as 'notAllowed'}`)
  }

  return (
    <ConfirmForm
      message={t('organizationRoles.remove.warning', { role: props.role.name })}
      confirmLabel={t('organizationRoles.remove.submit')}
      cancelLabel={t('actions.cancel')}
      pending={pending()}
      onConfirm={submit}
      onCancel={props.onCancel}
      failure={
        <Show when={failure()}>
          {(current) => <AuthFailureAlert failure={current()} message={message(current())} />}
        </Show>
      }
    />
  )
}
