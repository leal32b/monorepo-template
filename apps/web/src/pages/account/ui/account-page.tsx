import { Alert, Button } from '@repo/ui'
import { Navigate } from '@solidjs/router'
import { createResource, createSignal, Match, type ParentProps, Show, Switch } from 'solid-js'
import { getAccountSecurity } from '#entities/accounts'
import { ChangePasswordForm } from '#features/change-password'
import { EnableTwoFactor } from '#features/enable-two-factor'
import { SendPasswordLink } from '#features/request-password-reset'
import { ApiError, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { BackupCodes } from './backup-codes'

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
 * `/account`: the account security, in the app frame: the password, changed here, or created by a
 * link for an account made with Google alone; and the second step, turned on here with an
 * authenticator app, its backup codes shown once. It reads Better Auth directly (ADR 0020); a session
 * that ended on the way sends the user to sign in, to come back here.
 */
export function AccountPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const [security, { refetch, mutate }] = createResource(() => getAccountSecurity(auth))
  const [newCodes, setNewCodes] = createSignal<string[]>()

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
              <Section id="two-factor" title={t('account.twoFactor.title')}>
                <p>
                  {current().twoFactor
                    ? t('account.twoFactor.on')
                    : current().password
                      ? t('account.twoFactor.off')
                      : t('account.twoFactor.needsPassword')}
                </p>
                <Show when={newCodes()}>
                  {(codes) => (
                    <BackupCodes
                      codes={codes()}
                      email={current().email}
                      message={t('account.twoFactor.enabled')}
                      onSaved={() => setNewCodes(undefined)}
                    />
                  )}
                </Show>
                <Show when={current().password && !current().twoFactor}>
                  <p class="text-muted-foreground">{t('account.twoFactor.why')}</p>
                  <EnableTwoFactor
                    onEnabled={(codes) => {
                      setNewCodes(codes)
                      mutate({ ...current(), twoFactor: true })
                    }}
                    onAlreadyOn={() => mutate({ ...current(), twoFactor: true })}
                  />
                </Show>
              </Section>
            </>
          )}
        </Match>
      </Switch>
    </AppShell>
  )
}
