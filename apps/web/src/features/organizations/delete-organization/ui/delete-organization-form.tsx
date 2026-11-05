import { ConfirmForm, Field } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Organization } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { validateDeletion } from '../model/validate-deletion'

export type DeleteOrganizationFormProps = {
  organization: Organization
  /** Called once the organization is deleted, with every member's access gone. */
  onDeleted: () => void
  onCancel: () => void
}

/** Codes that mean the caller may not delete: the plugin's, and ours for a member who is not an owner (D7). */
const refusals = new Set(['ONLY_AN_OWNER_DELETES', 'YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION'])

/**
 * Deletes the organization, after its name is typed exactly (D7): it cannot be undone, so the
 * confirmation is an act, not a click. Checked on submit; the button waits while the request is on its
 * way. A caller who is no longer an owner is told so.
 */
export function DeleteOrganizationForm(props: DeleteOrganizationFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [typed, setTyped] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const checks = createFormChecks(() => validateDeletion(typed(), props.organization.name))

  const error = () =>
    checks.problems().confirm && t('organizationGeneral.delete.mismatch', { name: props.organization.name })

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    setFailure(undefined)
    if (checks.submit(event.currentTarget) === undefined) return

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.delete({ organizationId: props.organization.id }, options)
    )
    setPending(false)
    if (failed === undefined) props.onDeleted()
    else setFailure(failed)
  }

  return (
    <ConfirmForm
      message={t('organizationGeneral.delete.warning', { name: props.organization.name })}
      confirmLabel={t('organizationGeneral.delete.submit')}
      cancelLabel={t('actions.cancel')}
      pending={pending()}
      onConfirm={submit}
      onCancel={props.onCancel}
      onFocusOut={checks.recheck}
      failure={
        <Show when={failure()}>
          {(current) => (
            <AuthFailureAlert
              failure={current()}
              message={
                current().code !== undefined && refusals.has(current().code as string)
                  ? t('organizationGeneral.delete.onlyOwner')
                  : undefined
              }
            />
          )}
        </Show>
      }
    >
      <Field
        label={t('organizationGeneral.delete.label')}
        name="confirm"
        autocomplete="off"
        value={typed()}
        onChange={setTyped}
        error={error()}
      />
    </ConfirmForm>
  )
}
