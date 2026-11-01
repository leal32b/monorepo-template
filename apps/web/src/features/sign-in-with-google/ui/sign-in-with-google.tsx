import { Alert, Button, Icon } from '@repo/ui'
import { createSignal, Show } from 'solid-js'
import { useIdentityOptions } from '#entities/identity-options'
import { type AuthFailure, callAuth, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

export type SignInWithGoogleProps = {
  /** Where to come back to after Google, a path on this site (`safeNext`). */
  next: string
  /** What Google sign-in came back with in `?error=`, if anything. */
  error?: string | string[] | undefined
}

/** The errors Google sign-in comes back with that this screen has its own words for. */
const known = new Map<string, 'cancelled' | 'unverified' | 'notLinked' | 'interrupted'>([
  ['access_denied', 'cancelled'],
  ['email_not_verified', 'unverified'],
  ['account_not_linked', 'notLinked'],
  ['state_mismatch', 'interrupted']
])

/**
 * "Continue with Google" and the "or" that leads on to the form below it, when the API has Google on.
 * It comes first, since for most people it is the quickest way in; the form's own button stays last.
 * The app asks the API at start-up, so it is known at the first paint and nothing moves; when it is
 * not, the room is kept, unseen, while the screen asks. Better Auth answers with Google's page, and the
 * browser goes there; an error Google sign-in came back with shows below the button.
 */
export function SignInWithGoogle(props: SignInWithGoogleProps) {
  const auth = useAuth()
  const { t } = useI18n()
  const options = useIdentityOptions()
  const [pending, setPending] = createSignal(false)
  const [failure, setFailure] = createSignal<AuthFailure>()

  const code = () => (typeof props.error === 'string' ? props.error : undefined)

  const go = async () => {
    setFailure(undefined)
    setPending(true)
    const failed = await callAuth((callOptions) =>
      auth.signIn.social(
        {
          provider: 'google',
          callbackURL: props.next,
          errorCallbackURL: `/login?next=${encodeURIComponent(props.next)}`,
          disableRedirect: true
        },
        { ...callOptions, onSuccess: ({ data }) => window.location.assign(data.url) }
      )
    )
    if (failed) {
      setPending(false)
      setFailure(failed)
    }
  }

  return (
    <Show when={options() === undefined || options()?.google}>
      <div class="flex flex-col gap-4" classList={{ invisible: options() === undefined }}>
        <Button variant="outline" class="w-full" disabled={pending()} onClick={go}>
          <Icon name="google" />
          {t('signIn.google.continue')}
        </Button>
        <Show when={failure()}>{(current) => <AuthFailureAlert failure={current()} />}</Show>
        <Show when={code()}>
          {(current) => {
            const words = known.get(current())
            return (
              <Alert variant="error" reference={words ? undefined : t('failure.reference', { reference: current() })}>
                {t(`signIn.google.errors.${words ?? 'failed'}`)}
              </Alert>
            )
          }}
        </Show>
        <p class="flex items-center gap-3 text-sm text-muted-foreground">
          <span class="h-px flex-1 bg-border-subtle" aria-hidden="true" />
          {t('signIn.google.or')}
          <span class="h-px flex-1 bg-border-subtle" aria-hidden="true" />
        </p>
      </div>
    </Show>
  )
}
