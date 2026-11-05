import { organizationNameLength } from '@repo/contracts'
import { Button, Field, FormActions } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Organization } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { validateName } from '../model/validate-edit'

export type RenameOrganizationFormProps = {
  organization: Organization
  /** Called with the new name once it is saved, to say so where the user acted. */
  onSaved: (name: string) => void
  /** Closes the form: from its Cancel button, or when the name was not changed. */
  onCancel: () => void
}

/**
 * Renames the organization. The name is checked on submit, and again when the field is left after
 * that; the button waits while the request is on its way. A name that is already the current one just
 * closes the form, since there is nothing to save.
 */
export function RenameOrganizationForm(props: RenameOrganizationFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [name, setName] = createSignal(props.organization.name)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const checks = createFormChecks(() => validateName(name()))

  const error = () => {
    const problem = checks.problems().name
    return problem && t(`organizations.errors.${problem}`, organizationNameLength)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setFailure(undefined)
    const values = checks.submit(event.currentTarget)
    if (values === undefined) return
    if (values.name === props.organization.name) return props.onCancel()

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.update({ organizationId: props.organization.id, data: { name: values.name } }, options)
    )
    setPending(false)
    if (failed === undefined) props.onSaved(values.name)
    else setFailure(failed)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('organizationGeneral.details.name.label')}
        name="name"
        autocomplete="off"
        value={name()}
        onChange={setName}
        error={error()}
      />
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending()}>
          {t('organizationGeneral.details.name.save')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </FormActions>
      <Show when={failure()}>
        {(current) => (
          <AuthFailureAlert
            failure={current()}
            message={
              current().code === 'YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION'
                ? t('organizations.errors.notAllowed')
                : undefined
            }
          />
        )}
      </Show>
    </form>
  )
}
