import { Link } from '@repo/ui'
import { RequestResetForm } from '#features/request-password-reset'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/** `/forgot-password`: asks for a link to choose a new password, with a way back to sign in. */
export function ForgotPasswordPage() {
  const { t } = useI18n()

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
      <RequestResetForm />
    </EntryLayout>
  )
}
