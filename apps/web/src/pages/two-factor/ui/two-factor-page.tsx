import { Link, linkClass } from '@repo/ui'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { TwoFactorForm } from '#features/two-factor'
import { useI18n } from '#shared/config'
import { safeNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/login/two-factor`: the second step of a sign-in, with the code of the authenticator app or, when
 * the app is out of reach, a backup code; then on to `next` (T11). It replaces itself in the history,
 * as the sign-in does, and sends the user back to sign in, still headed to `next`, when the challenge ends
 * or when they ask: a way out for whoever signed in with the wrong account.
 */
export function TwoFactorPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [method, setMethod] = createSignal<'app' | 'backup'>('app')

  const next = () => safeNext(params.next, window.location.origin)
  const verified = () => navigate(next(), { replace: true })
  const signInAgain = () => `/login?next=${encodeURIComponent(next())}`

  return (
    <EntryLayout
      title={t('twoFactor.title')}
      description={t(`twoFactor.${method()}.description`)}
      footer={
        <div class="flex flex-col gap-2">
          <p>
            {t(`twoFactor.${method()}.other`)}{' '}
            <button type="button" class={linkClass} onClick={() => setMethod(method() === 'app' ? 'backup' : 'app')}>
              {t(`twoFactor.${method()}.switch`)}
            </button>
          </p>
          <p>
            {t('twoFactor.notYou')} <Link href={signInAgain()}>{t('twoFactor.signInAgain')}</Link>
          </p>
        </div>
      }
    >
      <Show when={method()} keyed>
        {(current) => <TwoFactorForm method={current} onVerified={verified} signInAgain={signInAgain()} />}
      </Show>
    </EntryLayout>
  )
}
