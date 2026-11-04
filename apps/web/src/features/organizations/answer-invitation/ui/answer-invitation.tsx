import { Button } from '@repo/ui'
import { Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { createInvitationAnswer, type InvitationAnswer } from '../model/create-invitation-answer'
import { AnswerFailure } from './answer-failure'

export type AnswerInvitationProps = {
  invitationId: string
  /** Called once Better Auth took the answer; the screen decides where the user goes next. */
  onAnswered: (answer: InvitationAnswer) => void
  /** Called when the invitation closed since the screen read it, so the screen reads it again. */
  onGone: () => void
}

/**
 * Accept, the action the screen is about, then Decline, each across the column (the one place an
 * invitation is answered: onboarding opens it here); both wait while an
 * answer is on its way, and why one did not go through shows below them, where nothing moves.
 */
export function AnswerInvitation(props: AnswerInvitationProps) {
  const { t } = useI18n()
  const { pending, failure, answer } = createInvitationAnswer(() => props.invitationId, {
    onAnswered: (kind) => props.onAnswered(kind),
    onGone: () => props.onGone()
  })

  return (
    <div class="flex flex-col gap-4">
      <Button variant="primary" class="w-full" disabled={pending()} onClick={() => answer('accepted')}>
        {t('invitation.pending.accept')}
      </Button>
      <Button variant="outline" class="w-full" disabled={pending()} onClick={() => answer('declined')}>
        {t('invitation.pending.decline')}
      </Button>
      <Show when={failure()}>{(current) => <AnswerFailure failure={current()} />}</Show>
    </div>
  )
}
