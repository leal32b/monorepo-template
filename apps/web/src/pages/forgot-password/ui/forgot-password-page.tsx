import { Link } from '@repo/ui'
import { useLocation, useSearchParams } from '@solidjs/router'
import { RequestResetForm } from '#features/request-password-reset'
import { useI18n } from '#shared/config'
import { safeNext, withNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/forgot-password`: asks for a link to choose a new password, with a way back to sign in. The email
 * the sign-in had typed arrives in the history's state, so it is not typed twice; `next`, where the
 * sign-in was headed (an invitation), goes on through the link and the new password to the sign-in.
 */
export function ForgotPasswordPage() {
  const { t } = useI18n()
  const location = useLocation<{ email: string }>()
  const [params] = useSearchParams()
  const next = () => safeNext(params.next, window.location.origin)

  const carried = () => {
    const email = location.state?.email
    return typeof email === 'string' ? email : undefined
  }

  return (
    <EntryLayout
      title={t('forgotPassword.title')}
      description={t('forgotPassword.description')}
      footer={
        <>
          {t('forgotPassword.remembered')} <Link href={withNext('/login', next())}>{t('forgotPassword.signIn')}</Link>
        </>
      }
    >
      <RequestResetForm email={carried()} next={next()} />
    </EntryLayout>
  )
}
