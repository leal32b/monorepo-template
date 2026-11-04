import { Button } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type Member, memberFailureKind } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type RemoveMemberFormProps = {
  organizationId: string
  organizationName: string
  member: Member
  /** Called once the person is removed. */
  onRemoved: () => void
  /** Called when the person is no longer a member, so the list can be read again. */
  onGone: () => void
  onCancel: () => void
}

/**
 * Removes a member, after saying who and from what: the person loses access at once, and an invitation
 * brings them back, so it asks once, in the row, rather than in a dialog. The button waits while the
 * request is on its way.
 */
export function RemoveMemberForm(props: RemoveMemberFormProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.organization.removeMember(
        { organizationId: props.organizationId, memberIdOrEmail: props.member.id },
        options
      )
    )
    setPending(false)
    if (failed === undefined) props.onRemoved()
    else if (memberFailureKind(failed) === 'gone') props.onGone()
    else setFailure(failed)
  }

  const message = (failed: AuthFailure) => {
    const kind = memberFailureKind(failed)
    return kind === undefined ? undefined : t(`organizationMembers.errors.${kind as 'notAllowed'}`)
  }

  return (
    <form noValidate onSubmit={submit} class="flex flex-col gap-4">
      <p class="text-muted-foreground">
        {t('organizationMembers.remove.warning', {
          name: props.member.name,
          organization: props.organizationName
        })}
      </p>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="destructive" class="w-full sm:w-auto" disabled={pending()}>
          {t('organizationMembers.remove.submit')}
        </Button>
        <Button variant="ghost" class="w-full sm:w-auto" onClick={props.onCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} message={message(current())} />}</Show>
    </form>
  )
}
