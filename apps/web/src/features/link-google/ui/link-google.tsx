import { Alert, Button } from '@repo/ui'
import { createSignal, onMount } from 'solid-js'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'

export type LinkGoogleProps = {
  /** Called with what went wrong linking could not start, to show where the user acted. */
  onFailure: (failure: AuthFailure) => void
}

export type LinkGoogleErrorProps = {
  /** The account's email: the Google account must have the same one. */
  email: string
  /** What linking came back with in `?error=`. */
  error: string
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
 * page and the browser goes there; Google comes back to the security page, with `?error=` when
 * linking failed (`LinkGoogleError`). It is only the button: the screen says what happened.
 */
export function LinkGoogle(props: LinkGoogleProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const [pending, setPending] = createSignal(false)

  const go = async () => {
    setPending(true)
    const failed = await callAuth((options) =>
      auth.linkSocial(
        {
          provider: 'google',
          callbackURL: '/settings/security',
          errorCallbackURL: '/settings/security',
          disableRedirect: true
        },
        { ...options, onSuccess: ({ data }) => window.location.assign(data.url) }
      )
    )
    if (failed) {
      setPending(false)
      props.onFailure(failed)
    }
  }

  return (
    <Button disabled={pending()} onClick={go}>
      {t('linkGoogle.submit')}
    </Button>
  )
}

/**
 * Why linking failed, in words for what users can fix. It takes focus, which brings it into view:
 * back from Google, the user lands at the top of the page.
 */
export function LinkGoogleError(props: LinkGoogleErrorProps) {
  const { t } = useI18n()
  const words = () => known.get(props.error)

  return (
    <Alert
      variant="error"
      reference={words() ? undefined : t('failure.reference', { reference: props.error })}
      tabIndex={-1}
      ref={(alert) => onMount(() => alert.focus())}
      class="outline-none"
    >
      {t(`linkGoogle.errors.${words() ?? 'failed'}`, { email: props.email })}
    </Alert>
  )
}
