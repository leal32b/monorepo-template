import { Alert, cn, Link, linkClass } from '@repo/ui'
import { A, useNavigate, useSearchParams } from '@solidjs/router'
import { Show } from 'solid-js'
import { ResendConfirmation } from '#features/resend-confirmation'
import { SignInForm } from '#features/sign-in'
import { SignInWithGoogle } from '#features/sign-in-with-google'
import { useI18n } from '#shared/config'
import { safeNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/** The errors a confirmation link comes back with, which the session guard brings here. */
const linkErrors = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN'])

/**
 * `/login`: email and password, or Google, then on to `next`, the page that sent the user here, when
 * it is on this site (T11). The sign-in replaces itself in the history, so Back does not return to
 * the form; Google comes back to `next` itself, and to this page with `?error=` when it fails. A
 * confirmation link that failed comes here with its own `?error=`, explained below the button, where
 * the answer to a sign-in takes its place. The way to a new password sits under the password field and
 * carries the email typed so far in the history's state, never in the URL.
 */
export function SignInPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const next = () => safeNext(params.next, window.location.origin)
  const signedIn = () => navigate(next(), { replace: true })
  const linkExpired = () => typeof params.error === 'string' && linkErrors.has(params.error)
  const secondStep = () => navigate(`/login/two-factor?next=${encodeURIComponent(next())}`, { replace: true })

  return (
    <EntryLayout
      title={t('signIn.title')}
      description={t('signIn.description')}
      footer={
        <>
          {t('signIn.noAccount')} <Link href="/signup">{t('signIn.signUp')}</Link>
        </>
      }
    >
      <SignInForm
        onSignedIn={signedIn}
        onSecondStep={secondStep}
        notice={
          <Show when={linkExpired()}>
            <Alert variant="error">{t('signIn.errors.linkExpired')}</Alert>
          </Show>
        }
        resend={(email) => <ResendConfirmation email={email} />}
        forgotPassword={(email) => (
          <A href="/forgot-password" state={{ email: email() }} class={cn(linkClass, '-mt-1 self-start text-sm')}>
            {t('signIn.forgot')}
          </A>
        )}
      />
      <SignInWithGoogle next={next()} error={linkExpired() ? undefined : params.error} />
    </EntryLayout>
  )
}
