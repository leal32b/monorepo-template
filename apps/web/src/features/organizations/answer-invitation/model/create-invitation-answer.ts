import { createSignal } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'

export type InvitationAnswer = 'accepted' | 'declined'

export type InvitationAnswerOptions = {
  /** Called once Better Auth took the answer; the screen decides where the user goes next. */
  onAnswered: (answer: InvitationAnswer) => void
  /**
   * Called instead of failing when the invitation is no longer open (it expired or was withdrawn
   * since the screen read it), so the screen reads it again and says what became of it.
   */
  onGone: () => void
}

/**
 * Accepting or declining one invitation: `answer` sends it, `pending` is true while it is on its way,
 * so both buttons can wait, and `failure` says why it did not go through.
 */
export function createInvitationAnswer(invitationId: () => string, options: InvitationAnswerOptions) {
  const auth = useAuth()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const answer = async (kind: InvitationAnswer) => {
    setFailure(undefined)
    setPending(true)
    const body = { invitationId: invitationId() }
    const failed = await callAuth((fetchOptions) =>
      kind === 'accepted'
        ? auth.organization.acceptInvitation(body, fetchOptions)
        : auth.organization.rejectInvitation(body, fetchOptions)
    )
    setPending(false)
    if (failed === undefined) options.onAnswered(kind)
    else if (failed.code === 'INVITATION_NOT_FOUND') options.onGone()
    else setFailure(failed)
  }

  return { pending, failure, answer }
}
