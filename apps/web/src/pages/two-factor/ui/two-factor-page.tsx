import { linkClass } from '@repo/ui'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { TwoFactorForm } from '#features/two-factor'
import { useI18n } from '#shared/config'
import { safeNext } from '#shared/lib'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * `/login/two-factor`: the second step of a sign-in, with the code of the authenticator app or, when
 * the app is out of reach, a backup code; then on to `next` (T11). It replaces itself in the history,
 * as the sign-in does, and sends the user back to sign in, still headed to `next`, when the challenge ends.
 */
export function TwoFactorPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [method, setMethod] = createSignal<'app' | 'backup'>('app')

  const next = () => safeNext(params.next, window.location.origin)
  const verified = () => navigate(next(), { replace: true })

  return (
    <EntryLayout
      title={t('twoFactor.title')}
      description={t(`twoFactor.${method()}.description`)}
      footer={
        <>
          {t(`twoFactor.${method()}.other`)}{' '}
          <button type="button" class={linkClass} onClick={() => setMethod(method() === 'app' ? 'backup' : 'app')}>
            {t(`twoFactor.${method()}.switch`)}
          </button>
        </>
      }
    >
      <Show when={method()} keyed>
        {(current) => (
          <TwoFactorForm
            method={current}
            onVerified={verified}
            signInAgain={`/login?next=${encodeURIComponent(next())}`}
          />
        )}
      </Show>
    </EntryLayout>
  )
}
