import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { invitationFailureKind } from '../model/invitation-failure'

/** What went wrong with an invitation, in the screen's own words when it has them, the usual ones otherwise. */
export function InvitationFailure(props: { failure: AuthFailure }) {
  const { t } = useI18n()
  const message = () => {
    const kind = invitationFailureKind(props.failure)
    return kind === undefined ? undefined : t(`organizationInvitations.errors.${kind}`)
  }

  return <AuthFailureAlert failure={props.failure} message={message()} />
}
