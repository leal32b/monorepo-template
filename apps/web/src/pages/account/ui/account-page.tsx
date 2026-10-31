import { Alert, Button } from '@repo/ui'
import { Navigate } from '@solidjs/router'
import { createResource, Match, type ParentProps, Switch } from 'solid-js'
import { getAccountSecurity } from '#entities/accounts'
import { ApiError, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

/** One part of the page, named by its heading. */
function Section(props: ParentProps<{ id: string; title: string }>) {
  return (
    <section aria-labelledby={props.id} class="flex flex-col gap-3">
      <h2 id={props.id} class="text-lg font-semibold tracking-tight">
        {props.title}
      </h2>
      {props.children}
    </section>
  )
}

/**
 * `/account`: the account security, in the app frame: how the account signs in and whether signing
 * in with the password asks for a second step. It reads Better Auth directly (ADR 0020); a session
 * that ended on the way sends the user to sign in, to come back here.
 */
export function AccountPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const [security, { refetch }] = createResource(() => getAccountSecurity(auth))

  return (
    <AppShell title={t('account.title')}>
      <Switch>
        <Match when={security.error instanceof ApiError && security.error.status === 401}>
          <Navigate href="/login?next=%2Faccount" />
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
                <p>{current().password ? t('account.password.set') : t('account.password.unset')}</p>
              </Section>
              <Section id="two-factor" title={t('account.twoFactor.title')}>
                <p>
                  {current().twoFactor
                    ? t('account.twoFactor.on')
                    : current().password
                      ? t('account.twoFactor.off')
                      : t('account.twoFactor.needsPassword')}
                </p>
              </Section>
            </>
          )}
        </Match>
      </Switch>
    </AppShell>
  )
}
