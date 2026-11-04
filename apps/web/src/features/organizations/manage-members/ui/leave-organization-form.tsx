import { Button } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { memberFailureKind, type Organization } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type LeaveOrganizationFormProps = {
  organization: Organization
  /** Called once the caller has left, with their access gone. */
  onLeft: () => void
  onCancel: () => void
}

/**
 * Leaves the organization, after saying what it costs: access at once, and a new invitation to come back.
 * The only owner cannot leave (D7): the screen says so before this form, and the API refuses it too.
 */
export function LeaveOrganizationForm(props: LeaveOrganizationFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.leave({ organizationId: props.organization.id }, options)
    )
    setPending(false)
    if (failed === undefined) props.onLeft()
    else setFailure(failed)
  }

  const message = (failed: AuthFailure) =>
    memberFailureKind(failed) === 'lastOwner' ? t('organizationMembers.errors.lastOwner') : undefined

  return (
    <form noValidate onSubmit={submit} class="flex flex-col gap-4">
      <p class="text-muted-foreground">
        {t('organizationMembers.leave.warning', { organization: props.organization.name })}
      </p>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="destructive" class="w-full sm:w-auto" disabled={pending()}>
          {t('organizationMembers.leave.submit')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
