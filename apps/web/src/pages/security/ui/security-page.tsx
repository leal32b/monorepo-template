import { Alert, Button } from '@repo/ui'
import { Navigate, useSearchParams } from '@solidjs/router'
import { createResource, Match, Show, Switch } from 'solid-js'
import { getAccountSecurity } from '#entities/accounts'
import { ChangePasswordForm } from '#features/change-password'
import { SendPasswordLink } from '#features/request-password-reset'
import { ApiError, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { GoogleSection } from './google-section'
import { Section } from './section'
import { TwoFactorSection } from './two-factor-section'

/**
 * `/settings/security`: the account security, in the app frame: the password, changed here, or created by a
 * link for an account made with Google alone; the second step, turned on and off here; and Google,
 * linked and unlinked here, coming back with `?error=` when linking failed. It reads Better Auth
 * directly (ADR 0020); a session that ended on the way sends the user to sign in, to come back here.
 */
export function SecurityPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [security, { refetch, mutate }] = createResource(() => getAccountSecurity(auth))

  return (
    <AppShell title={t('account.title')}>
      <Switch>
        <Match when={security.error instanceof ApiError && security.error.status === 401}>
          <Navigate href="/login?next=%2Fsettings%2Fsecurity" />
        </Match>
        <Match when={security.error}>
          <Alert variant="error" action={<Button onClick={() => refetch()}>{t('account.retry')}</Button>}>
            {t('account.unavailable')}
          </Alert>
        </Match>
        <Match when={security.state === 'ready' && security()}>
          {(current) => (
            <>
              <Section id="password" title={t('account.password.title')}>
                <Show
                  when={current().password}
                  fallback={
                    <>
                      <p>{t('account.password.unset')}</p>
                      <p class="text-muted-foreground">{t('createPassword.why')}</p>
                      <SendPasswordLink email={current().email} />
                    </>
                  }
                >
                  <p>{t('account.password.set')}</p>
                  <p class="text-muted-foreground">{t('changePassword.signsOut')}</p>
                  <ChangePasswordForm />
                </Show>
              </Section>
              <TwoFactorSection security={current()} onChange={mutate} />
              <GoogleSection security={current()} error={params.error} onChange={mutate} />
            </>
          )}
        </Match>
      </Switch>
    </AppShell>
  )
}
