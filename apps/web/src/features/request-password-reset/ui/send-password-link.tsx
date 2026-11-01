import { Button } from '@repo/ui'
import { createSignal } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'

export type SendPasswordLinkProps = {
  email: string
  /** Called once the link is on its way, to say so where the user acted. */
  onSent: () => void
  /** Called with what went wrong, to show where the user acted. */
  onFailure: (failure: AuthFailure) => void
}

/**
 * For an account made with Google alone: sends the link to choose a password to the account's own
 * address. The link lands on the same page as a reset, and Better Auth creates the password there.
 * It is only the button: the screen says what happened.
 */
export function SendPasswordLink(props: SendPasswordLinkProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const send = async () => {
    setPending(true)
    const failed = await callAuth((options) =>
      auth.requestPasswordReset({ email: props.email, redirectTo: '/reset-password' }, options)
    )
    setPending(false)
    if (failed === undefined) props.onSent()
    else props.onFailure(failed)
  }

  return (
    <Button disabled={pending()} onClick={send}>
      {t('createPassword.send')}
    </Button>
  )
}
