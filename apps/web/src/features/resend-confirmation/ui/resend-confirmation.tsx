import { Alert, Button } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

/**
 * Sends the email confirmation link again, for when it did not arrive. The API answers the same
 * whether or not the address has an account to confirm (T08), so the screen can only say it was sent.
 */
export function ResendConfirmation(props: { email: string }) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [sent, setSent] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const send = async () => {
    setSent(false)
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.sendVerificationEmail({ email: props.email, callbackURL: '/' }, options)
    )
    setPending(false)
    if (failed === undefined) setSent(true)
    else setFailure(failed)
  }

  return (
    <div class="flex flex-col gap-4">
      <Button class="w-full" disabled={pending()} onClick={send}>
        {t('resendConfirmation.send')}
      </Button>
      <Show when={sent()}>
        <Alert>{t('resendConfirmation.sent')}</Alert>
      </Show>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </div>
  )
}
