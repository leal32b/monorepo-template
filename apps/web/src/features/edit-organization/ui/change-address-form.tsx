import { Button, Field } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Organization } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { validateAddress } from '../model/validate-edit'

export type ChangeAddressFormProps = {
  organization: Organization
  /** Called with the new address (slug) once it is saved. */
  onSaved: (slug: string) => void
  /** Closes the form: from its Cancel button, or when the address was not changed. */
  onCancel: () => void
}

/**
 * Changes the address the organization has in the URL (ADR 0034). It says first that links to the old
 * address stop working, since no history of old addresses is kept. The address is checked by the same
 * rules as the API's, and one the API says belongs to someone else is marked on the field, whatever the
 * capitals. An address that is already the current one just closes the form.
 */
export function ChangeAddressForm(props: ChangeAddressFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [slug, setSlug] = createSignal(props.organization.slug)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const taken = new Set<string>()
  const checks = createFormChecks(() => validateAddress(slug(), taken))

  const error = () => {
    const problem = checks.problems().slug
    return problem && t(`organizations.errors.${problem}`)
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    const form = event.currentTarget
    setFailure(undefined)
    const values = checks.submit(form)
    if (values === undefined) return
    if (values.slug === props.organization.slug) return props.onCancel()

    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.update({ organizationId: props.organization.id, data: { slug: values.slug } }, options)
    )
    setPending(false)

    if (failed === undefined) {
      props.onSaved(values.slug)
    } else if (failed.code === 'ORGANIZATION_SLUG_ALREADY_TAKEN') {
      taken.add(values.slug)
      checks.submit(form)
    } else {
      setFailure(failed)
    }
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <p class="text-muted-foreground">{t('organizationGeneral.details.address.warning')}</p>
      <Field
        label={t('organizationGeneral.details.address.label')}
        name="address"
        autocomplete="off"
        autocapitalize="none"
        spellcheck={false}
        value={slug()}
        onChange={setSlug}
        error={error()}
      />
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" class="w-full sm:w-auto" disabled={pending()}>
          {t('organizationGeneral.details.address.save')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
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
