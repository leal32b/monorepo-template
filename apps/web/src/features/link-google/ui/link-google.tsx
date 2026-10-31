import { Alert, Button } from '@repo/ui'
import { createSignal, onMount, Show } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type LinkGoogleProps = {
  /** The account's email: the Google account must have the same one. */
  email: string
  /** What linking came back with in `?error=`, if anything. */
  error?: string | string[] | undefined
}

/** The errors linking comes back with that this screen has its own words for. */
const known = new Map<string, 'cancelled' | 'otherEmail' | 'otherUser' | 'interrupted'>([
  ['access_denied', 'cancelled'],
  ['email_does_not_match', 'otherEmail'],
  ['account_already_linked_to_different_user', 'otherUser'],
  ['state_mismatch', 'interrupted']
])

/**
 * Links a Google account, so the user can also sign in with it. Better Auth answers with Google's
 * page and the browser goes there; Google comes back to the account page, with `?error=` when linking
 * failed. That shows below the button and takes focus, which brings it into view: back from Google,
 * the user lands at the top of the page.
 */
export function LinkGoogle(props: LinkGoogleProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const code = () => (typeof props.error === 'string' ? props.error : undefined)

  const go = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((options) =>
      auth.linkSocial(
        { provider: 'google', callbackURL: '/account', errorCallbackURL: '/account', disableRedirect: true },
        { ...options, onSuccess: ({ data }) => window.location.assign(data.url) }
      )
    )
    if (failed) {
      setPending(false)
      setFailure(failed)
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <Button variant="outline" class="w-full sm:w-auto sm:self-start" disabled={pending()} onClick={go}>
        {t('linkGoogle.submit')}
      </Button>
      <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
      <Show when={code()}>
        {(current) => {
          const words = known.get(current())
          return (
            <Alert
              variant="error"
              reference={words ? undefined : t('failure.reference', { reference: current() })}
              tabIndex={-1}
              ref={(alert) => onMount(() => alert.focus())}
              class="outline-none"
            >
              {t(`linkGoogle.errors.${words ?? 'failed'}`, { email: props.email })}
            </Alert>
          )
        }}
      </Show>
    </div>
  )
}
