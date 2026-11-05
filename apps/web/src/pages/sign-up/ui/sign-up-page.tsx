import { Link, linkClass } from '@repo/ui'
import { useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { ResendConfirmation } from '#features/resend-confirmation'
import { SignInWithGoogle } from '#features/sign-in-with-google'
import { SignUpForm, type SignUpValues } from '#features/sign-up'
import { useI18n } from '#shared/config'
import { safeNext, withNext } from '#shared/lib'
import { OpenMail } from '#shared/ui'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/signup`: the form, or Google, as on the sign-in; then "check your email" in the same frame, with
 * a way to send the link again or to go back and fix the address. What was sent stays in the page,
 * not in the URL, where it would be personal data in a query string. `next`, a path on this site
 * (T11), is where the confirmation link and Google land, as on the sign-in: an invitation opened while
 * signed out ends up where it started.
 */
export function SignUpPage() {
  const { t } = useI18n()
  const [sent, setSent] = createSignal<SignUpValues>()
  const [editing, setEditing] = createSignal(true)
  const [params] = useSearchParams()

  const next = () => safeNext(params.next, window.location.origin)

  const signedUp = (values: SignUpValues) => {
    setSent(values)
    setEditing(false)
  }

  return (
    <Show
      when={!editing() && sent()}
      fallback={
        <EntryLayout
          title={t('signUp.title')}
          description={t('signUp.description')}
          footer={
            <>
              {t('signUp.haveAccount')} <Link href={withNext('/login', next())}>{t('signUp.signIn')}</Link>
            </>
          }
        >
          <SignInWithGoogle next={next()} />
          <SignUpForm initial={sent()} onSignedUp={signedUp} next={next()} />
        </EntryLayout>
      }
    >
      {(values) => (
        <EntryLayout
          title={t('signUp.checkEmail.title')}
          description={t('signUp.checkEmail.description')}
          footer={
            <>
              {t('signUp.checkEmail.wrongAddress')}{' '}
              <button type="button" class={linkClass} onClick={() => setEditing(true)}>
                {t('signUp.checkEmail.useAnother')}
              </button>
            </>
          }
        >
          <div class="flex flex-col gap-4">
            <p class="break-words">
              {t('signUp.checkEmail.sentTo')} <strong class="font-semibold">{values().email}</strong>.
            </p>
            <p class="text-muted-foreground">{t('signUp.checkEmail.notThere')}</p>
            <OpenMail email={values().email} />
            <ResendConfirmation email={values().email} justSent next={next()} />
          </div>
        </EntryLayout>
      )}
    </Show>
  )
}
