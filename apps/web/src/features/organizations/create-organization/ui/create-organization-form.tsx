import { organizationNameLength } from '@repo/contracts'
import { Button, Field } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { slugFromName, withSuffix } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createFormChecks } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'
import { validateOrganization } from '../model/validate-organization'

export type CreateOrganizationFormProps = {
  /** Called with the slug of the new organization, which the user now owns. */
  onCreated: (slug: string) => void
}

/** Other slugs tried, with a short suffix, when the one the name suggests is taken. */
const RETRIES = 3

const randomSuffix = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0')

/**
 * One field: the organization's name. The slug is derived from it (ADR 0034), and when someone else
 * has it a short suffix is added, so the user is never asked for a second field. The name is checked
 * on submit, and again when the field is left after that; the button waits while the request is on its
 * way. The new organization is not made the session's active one: the URL says which one a screen is for.
 */
export function CreateOrganizationForm(props: CreateOrganizationFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [name, setName] = createSignal('')
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const checks = createFormChecks(() => validateOrganization(name()))

  const error = () => {
    const problem = checks.problems().name
    return problem && t(`organizations.errors.${problem}`, organizationNameLength)
  }

  /** The slug it was created under, or what went wrong. */
  const create = async (values: { name: string }): Promise<{ slug: string } | AuthFailure> => {
    const base = slugFromName(values.name)
    let failed: AuthFailure | undefined
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const slug = attempt === 0 ? base : withSuffix(base, randomSuffix())
      failed = await callAuth((options) =>
        auth.organization.create({ ...values, slug, keepCurrentActiveOrganization: true }, options)
      )
      if (failed === undefined) return { slug }
      if (failed.code !== 'ORGANIZATION_ALREADY_EXISTS') break
    }
    return failed as AuthFailure
  }

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault()
    setFailure(undefined)
    const values = checks.submit(event.currentTarget)
    if (values === undefined) return

    setPending(true)
    const result = await create(values)
    setPending(false)
    if ('slug' in result) props.onCreated(result.slug)
    else setFailure(result)
  }

  return (
    <form noValidate onSubmit={submit} onFocusOut={checks.recheck} class="flex flex-col gap-4">
      <Field
        label={t('organizations.create.name')}
        name="name"
        autocomplete="off"
        value={name()}
        onChange={setName}
        error={error()}
      />
      <Button type="submit" variant="primary" class="mt-2 w-full" disabled={pending()}>
        {t('organizations.create.submit')}
      </Button>
      <Show when={failure()}>
        {(current) => (
          <AuthFailureAlert
            failure={current()}
            message={
              current().code === 'YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS'
                ? t('organizations.errors.limitReached')
                : undefined
            }
          />
        )}
      </Show>
    </form>
  )
}
