import { Alert, Button, SettingsSection } from '@repo/ui'
import { Navigate, useSearchParams } from '@solidjs/router'
import { createResource, createSignal, Match, Switch } from 'solid-js'
import { getAccountSecurity } from '#entities/accounts'
import { ApiError, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { AuthenticatorRow } from './authenticator-row'
import { BackupCodesRow } from './backup-codes-row'
import { GoogleRow } from './google-row'
import type { PanelName } from './panel'
import { PasswordRow } from './password-row'

/**
 * `/settings/security`: how the account signs in, in sections of rows. "Ways to sign in" holds the
 * password, changed here or created by a link for an account made with Google alone, and Google,
 * linked and unlinked here, coming back with `?error=` when linking failed. "Two-step verification"
 * holds the authenticator app and the backup codes. A row's form opens inline below it, one at a time.
 * It reads Better Auth directly (ADR 0020); a session that ended on the way sends the user to sign in,
 * to come back here.
 */
export function SecurityPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [security, { refetch, mutate }] = createResource(() => getAccountSecurity(auth))
  const [open, setOpen] = createSignal<PanelName>()
  const panel = {
    get open() {
      return open()
    },
    onOpen: setOpen,
    onClose: () => setOpen(undefined)
  }

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
              <SettingsSection title={t('account.signIn.title')} description={t('account.signIn.description')}>
                <PasswordRow {...panel} security={current()} />
                <GoogleRow security={current()} error={params.error} onChange={mutate} />
              </SettingsSection>
              <SettingsSection title={t('account.twoFactor.title')} description={t('account.twoFactor.description')}>
                <AuthenticatorRow {...panel} security={current()} onChange={mutate} />
                <BackupCodesRow {...panel} security={current()} onChange={mutate} />
              </SettingsSection>
            </>
          )}
        </Match>
      </Switch>
    </AppShell>
  )
}
