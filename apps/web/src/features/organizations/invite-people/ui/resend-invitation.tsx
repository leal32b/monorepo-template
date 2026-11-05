import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import type { PendingInvitation } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'

export type ResendInvitationProps = {
  organizationId: string
  invitation: PendingInvitation
  /** Keeps the button from being pressed while another action on the invitation is on. */
  disabled?: boolean | undefined
  /** Told when the request starts and ends, so the screen can keep the other actions from running meanwhile. */
  onPending: (pending: boolean) => void
  /** Called once the email is sent again, with the week renewed. */
  onSent: () => void
  /** Called with what went wrong, to show it where the user acted with `InvitationFailure`. */
  onFailure: (failure: AuthFailure) => void
}

/**
 * Sends a pending invitation again, with the same role: the link is the same and its week starts over.
 * It is the way out when the email did not arrive, since a failed send never blocks the invitation. The
 * button waits while the request is on its way, so a second click does not send twice.
 */
export function ResendInvitation(props: ResendInvitationProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const resend = async () => {
    setPending(true)
    props.onPending(true)
    const failed = await callAuth((options) =>
      auth.organization.inviteMember(
        {
          organizationId: props.organizationId,
          email: props.invitation.email,
          role: props.invitation.roles,
          resend: true
        },
        options
      )
    )
    setPending(false)
    props.onPending(false)
    if (failed === undefined) props.onSent()
    else props.onFailure(failed)
  }

  return (
    <Button disabled={pending() || props.disabled} onClick={resend}>
      {t('organizationInvitations.row.resend')}
    </Button>
  )
}
