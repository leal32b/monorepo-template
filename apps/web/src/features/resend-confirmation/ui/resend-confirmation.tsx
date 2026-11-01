import { Alert, Button } from '@repo/ui'
import { createSignal, onMount, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { createCooldown } from '#shared/lib'
import { AuthFailureAlert } from '#shared/ui'

/** Seconds before the link can be sent again: the API limits it, and a second one helps no one. */
const waitSeconds = 30

/**
 * Sends the email confirmation link again, for when it did not arrive. The API answers the same
 * whether or not the address has an account to confirm (T08), so the screen can only say it was sent.
 * After a send the button waits 30 seconds and counts them out on itself, so a second press cannot
 * happen by accident and the API's limit is not met; `justSent` starts that wait at once, for a screen
 * that has just sent the first email.
 */
export function ResendConfirmation(props: { email: string; justSent?: boolean | undefined }) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [sent, setSent] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const cooldown = createCooldown(waitSeconds)
  onMount(() => props.justSent && cooldown.start())

  const send = async () => {
    setSent(false)
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.sendVerificationEmail({ email: props.email, callbackURL: '/' }, options)
    )
    setPending(false)
    if (failed === undefined) {
      setSent(true)
      cooldown.start()
    } else setFailure(failed)
  }

  return (
    <div class="flex flex-col gap-4">
      <Button class="w-full" disabled={pending() || cooldown.remaining() > 0} onClick={send}>
        {cooldown.remaining() > 0
          ? t('resendConfirmation.wait', { seconds: cooldown.remaining() })
          : t('resendConfirmation.send')}
      </Button>
      <Show when={sent()}>
        <Alert variant="success">{t('resendConfirmation.sent')}</Alert>
      </Show>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </div>
  )
}
