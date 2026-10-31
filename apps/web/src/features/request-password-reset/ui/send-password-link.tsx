import { Button } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

/**
 * For an account made with Google alone: sends the link to choose a password to the account's own
 * address. The link lands on the same page as a reset, and Better Auth creates the password there.
 */
export function SendPasswordLink(props: { email: string }) {
  const auth = useAuth()
  const { t } = useI18n()
  const [sent, setSent] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()
  const [pending, setPending] = createSignal(false)

  const send = async () => {
    setSent(false)
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.requestPasswordReset({ email: props.email, redirectTo: '/reset-password' }, options)
    )
    setPending(false)
    if (failed === undefined) setSent(true)
    else setFailure(failed)
  }

  return (
    <div class="flex flex-col gap-4">
      <Button class="w-full sm:w-auto sm:self-start" disabled={pending()} onClick={send}>
        {t('createPassword.send')}
      </Button>
      <Show when={sent()}>
        <p role="status" class="break-words text-sm">
          {t('createPassword.sent', { email: props.email })}
        </p>
      </Show>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
    </div>
  )
}
