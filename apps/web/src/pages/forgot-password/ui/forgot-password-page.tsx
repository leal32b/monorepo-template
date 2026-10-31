import { Link } from '@repo/ui'
import { useLocation } from '@solidjs/router'
import { RequestResetForm } from '#features/request-password-reset'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/forgot-password`: asks for a link to choose a new password, with a way back to sign in. The email
 * the sign-in had typed arrives in the history's state, so it is not typed twice.
 */
export function ForgotPasswordPage() {
  const { t } = useI18n()
  const location = useLocation<{ email: string }>()

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
          {t('forgotPassword.remembered')} <Link href="/login">{t('forgotPassword.signIn')}</Link>
        </>
      }
    >
      <RequestResetForm email={carried()} />
    </EntryLayout>
  )
}
