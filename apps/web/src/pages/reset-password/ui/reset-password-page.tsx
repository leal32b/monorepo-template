import { Alert, buttonVariants, Link } from '@repo/ui'
import { useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { ResetPasswordForm } from '#features/reset-password'
import { useI18n } from '#shared/config'
import { safeNext, withNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/reset-password`: where the link in the email lands, with `?token=` while it is good and
 * `?error=INVALID_TOKEN` once it expired or was used. It says up front that a new password signs
 * the user out everywhere else (T10), and after the change it points to the sign-in, still headed to
 * `next` (an invitation) when the request came with one.
 */
export function ResetPasswordPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [done, setDone] = createSignal(false)

  const token = () => (typeof params.token === 'string' && params.error === undefined ? params.token : undefined)
  const next = () => safeNext(params.next, window.location.origin)
  const askAgain = () => withNext('/forgot-password', next())

  return (
    <Show
      when={!done()}
      fallback={
        <EntryLayout title={t('resetPassword.done.title')} description={t('resetPassword.done.description')}>
          <a href={withNext('/login', next())} class={buttonVariants({ variant: 'primary', class: 'w-full' })}>
            {t('resetPassword.done.signIn')}
          </a>
        </EntryLayout>
      }
    >
      <EntryLayout
        title={token() ? t('resetPassword.title') : t('resetPassword.expiredTitle')}
        description={token() ? t('resetPassword.description') : undefined}
        footer={
          <>
            {t('resetPassword.changedMind')} <Link href={withNext('/login', next())}>{t('resetPassword.signIn')}</Link>
          </>
        }
      >
        <Show
          when={token()}
          fallback={
            <Alert variant="error" action={<Link href={askAgain()}>{t('resetPassword.askAgain')}</Link>}>
              {t('resetPassword.expired')}
            </Alert>
          }
        >
          {(current) => <ResetPasswordForm token={current()} onReset={() => setDone(true)} askAgain={askAgain()} />}
        </Show>
      </EntryLayout>
    </Show>
  )
}
