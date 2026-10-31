import { Link } from '@repo/ui'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { ResendConfirmation } from '#features/resend-confirmation'
import { SignInForm } from '#features/sign-in'
import { SignInWithGoogle } from '#features/sign-in-with-google'
import { useI18n } from '#shared/config'
import { safeNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/login`: email and password, or Google, then on to `next`, the page that sent the user here, when
 * it is on this site (T11). The sign-in replaces itself in the history, so Back does not return to
 * the form; Google comes back to `next` itself, and to this page with `?error=` when it fails.
 */
export function SignInPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const next = () => safeNext(params.next, window.location.origin)
  const signedIn = () => navigate(next(), { replace: true })

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
      <SignInForm onSignedIn={signedIn} resend={(email) => <ResendConfirmation email={email} />} />
      <SignInWithGoogle next={next()} error={params.error} />
    </EntryLayout>
  )
}
