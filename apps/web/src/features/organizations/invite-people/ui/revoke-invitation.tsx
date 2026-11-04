import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import type { PendingInvitation } from '#entities/organizations'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'

export type RevokeInvitationProps = {
  invitation: PendingInvitation
  /** Keeps the button from being pressed while another action on the invitation is on. */
  disabled?: boolean | undefined
  /** Told when the request starts and ends, so the screen can keep the other actions from running meanwhile. */
  onPending: (pending: boolean) => void
  /** Called once the invitation is revoked. */
  onRevoked: () => void
  /** Called with what went wrong, to show it where the user acted with `InvitationFailure`. */
  onFailure: (failure: AuthFailure) => void
}

/**
 * Revokes a pending invitation, with no confirmation: the person can be invited again at any time, so
 * asking first would only be a click to get past. The link stops working at once.
 */
export function RevokeInvitation(props: RevokeInvitationProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const revoke = async () => {
    setPending(true)
    props.onPending(true)
    const failed = await callAuth((options) =>
      auth.organization.cancelInvitation({ invitationId: props.invitation.id }, options)
    )
    setPending(false)
    props.onPending(false)
    if (failed === undefined) props.onRevoked()
    else props.onFailure(failed)
  }

  return (
    <Button disabled={pending() || props.disabled} onClick={revoke}>
      {t('organizationInvitations.row.revoke')}
    </Button>
  )
}
