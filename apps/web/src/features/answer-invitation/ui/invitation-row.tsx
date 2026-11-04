import { Alert, Button, SettingsRow } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import type { Invitation } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type InvitationRowProps = {
  invitation: Invitation
  /** Called once Better Auth took the answer; the screen decides where the user goes next. */
  onAnswered: (answer: 'accepted' | 'declined') => void
}

const failureTexts = {
  INVITATION_NOT_FOUND: 'invitations.errors.gone',
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: 'invitations.errors.full'
} as const

/**
 * One invitation to answer: the organization, when the invitation expires, and Accept or Decline.
 * Both buttons wait while an answer is on its way. An invitation that expired or was withdrawn since
 * the list was read, or an organization with no room left, says so below the row, in words that say
 * what to do next; anything else is the generic failure, and the user can try again.
 */
export function InvitationRow(props: InvitationRowProps) {
  const auth = useAuth()
  const { t, locale } = useI18n()
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)
  const organization = () => ({ organization: props.invitation.organizationName })

  const answer = async (kind: 'accepted' | 'declined') => {
    const { id: invitationId } = props.invitation
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      kind === 'accepted'
        ? auth.organization.acceptInvitation({ invitationId }, options)
        : auth.organization.rejectInvitation({ invitationId }, options)
    )
    setPending(false)
    if (failed === undefined) props.onAnswered(kind)
    else setFailure(failed)
  }

  const date = () => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(props.invitation.expiresAt)

  return (
    <SettingsRow
      icon="users"
      title={props.invitation.organizationName}
      description={t('invitations.expires', { date: date() })}
      action={
        <>
          <Button
            variant="outline"
            disabled={pending()}
            aria-label={t('invitations.declineLabel', organization())}
            onClick={() => answer('declined')}
          >
            {t('invitations.decline')}
          </Button>
          <Button
            variant="primary"
            disabled={pending()}
            aria-label={t('invitations.acceptLabel', organization())}
            onClick={() => answer('accepted')}
          >
            {t('invitations.accept')}
          </Button>
        </>
      }
      panel={
        <Show when={failure()}>
          {(current) => {
            const key = failureTexts[current().code as keyof typeof failureTexts]
            return key === undefined ? (
              <AuthFailureAlert failure={current()} />
            ) : (
              <Alert variant="error">{t(key)}</Alert>
            )
          }}
        </Show>
      }
    />
  )
}
