import { Button, SettingsRow } from '@repo/ui'
import { Show } from 'solid-js'
import type { Invitation } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { createInvitationAnswer, type InvitationAnswer } from '../model/create-invitation-answer'
import { AnswerFailure } from './answer-failure'

export type InvitationRowProps = {
  invitation: Invitation
  /** Called once Better Auth took the answer; the screen decides where the user goes next. */
  onAnswered: (answer: InvitationAnswer) => void
}

/**
 * One invitation to answer: the organization, when the invitation expires, and Accept or Decline.
 * Both buttons wait while an answer is on its way; why one did not go through shows below the row,
 * and the user can try again.
 */
export function InvitationRow(props: InvitationRowProps) {
  const { t, locale } = useI18n()
  const { pending, failure, answer } = createInvitationAnswer(() => props.invitation.id, {
    onAnswered: (kind) => props.onAnswered(kind)
  })
  const organization = () => ({ organization: props.invitation.organizationName })
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
      panel={<Show when={failure()}>{(current) => <AnswerFailure failure={current()} />}</Show>}
    />
  )
}
