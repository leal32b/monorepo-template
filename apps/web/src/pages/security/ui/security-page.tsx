import { createPanels, SettingsSection } from '@repo/ui'
import { useSearchParams } from '@solidjs/router'
import { Show } from 'solid-js'
import { type AccountSecurity, type SignInMethods, signInMethodsQuery } from '#entities/accounts'
import { type SessionUser, sessionQuery } from '#entities/sessions'
import { createRead, updateRead, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'
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
 *
 * The second step's state comes from the session the app read at its start, and only the ways to sign in
 * are asked for, both by keys a change here updates (ADR 0038).
 */
export function SecurityPage() {
  const { t } = useI18n()

  return (
    <AppShell title={t('account.title')}>
      <ReadFailure message={t('account.unavailable')}>
        <Sections />
      </ReadFailure>
    </AppShell>
  )
}

/** The two sections once read. */
function Sections() {
  const auth = useAuth()
  const { t } = useI18n()
  const [params] = useSearchParams()
  const session = sessionQuery(auth)
  const methods = signInMethodsQuery(auth)
  const user = createRead(() => session(), session.keyFor())
  const ways = createRead(() => methods(), methods.keyFor())
  const security = (): AccountSecurity | undefined => {
    const signedIn = user()
    const signIn = ways()
    return signedIn && signIn ? { ...signIn, email: signedIn.email, twoFactor: signedIn.twoFactorEnabled } : undefined
  }
  /** A change made here, kept for the next visit and drawn at once. */
  const change = (next: AccountSecurity) => {
    updateRead<SessionUser>(session.keyFor(), (current) => ({ ...current, twoFactorEnabled: next.twoFactor }))
    updateRead<SignInMethods>(methods.keyFor(), () => ({
      password: next.password,
      googleAccountId: next.googleAccountId
    }))
  }
  const panels = createPanels<PanelName>()

  return (
    <Show when={security()}>
      {(current) => (
        <>
          <SettingsSection title={t('account.signIn.title')} description={t('account.signIn.description')}>
            <PasswordRow panels={panels} security={current()} />
            <GoogleRow panels={panels} security={current()} error={params.error} onChange={change} />
          </SettingsSection>
          <SettingsSection title={t('account.twoFactor.title')} description={t('account.twoFactor.description')}>
            <AuthenticatorRow panels={panels} security={current()} onChange={change} />
            <BackupCodesRow panels={panels} security={current()} onChange={change} />
          </SettingsSection>
        </>
      )}
    </Show>
  )
}
