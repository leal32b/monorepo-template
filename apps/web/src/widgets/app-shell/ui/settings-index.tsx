import { Icon } from '@repo/ui'
import { Navigate, useLocation } from '@solidjs/router'
import { Show } from 'solid-js'
import { useImpersonation } from '#entities/impersonations'
import { homeOf, useOrganization } from '#entities/organizations'
import { useSession } from '#entities/sessions'
import { useI18n } from '#shared/config'
import { accountSettings, organizationSettings, visitable } from '../model/settings-items'
import { useShell } from '../model/shell'
import { createWide } from '../model/wide'
import { AppShell } from './app-shell'
import { rowClass, SettingsGroup } from './nav-link'

/**
 * `/settings`, the You tab (ADR 0080): on phones a screen with the person's three settings and signing out;
 * from `md`, where the side menu lists them, it opens the first.
 */
export function AccountSettingsIndex() {
  const { t } = useI18n()
  const wide = createWide()
  const user = useSession()
  const location = useLocation()

  return (
    <Show when={!wide()} fallback={<Navigate href={accountSettings[0]?.href as string} />}>
      <AppShell title={t('appShell.nav.you')} description={t('appShell.you.signedInAs', { email: user.email })}>
        <nav aria-label={t('appShell.nav.account')} class="flex flex-col gap-1">
          <SettingsGroup
            items={accountSettings}
            path={() => location.pathname}
            name={(label) => t(`appShell.nav.${label}`)}
          />
          <SignOutRow />
        </nav>
      </AppShell>
    </Show>
  )
}

/** Signing out, the last row of the You screen, through the frame, which says why it failed below the title. */
function SignOutRow() {
  const { t } = useI18n()
  const shell = useShell()
  return (
    <button type="button" class={rowClass} onClick={() => shell?.signOut()}>
      <Icon name="sign-out" />
      {t('appShell.account.signOut')}
    </button>
  )
}

/**
 * `/:orgSlug/settings` (ADR 0080): on phones a screen listing the organization's settings, those an
 * operator's visit can read only (ADR 0077); from `md`, where the side menu lists them, it opens General.
 */
export function OrganizationSettingsIndex() {
  const { t } = useI18n()
  const wide = createWide()
  const location = useLocation()
  const current = useOrganization()
  const impersonation = useImpersonation()
  const items = () =>
    organizationSettings(homeOf(current.organization)).filter(
      (item) => impersonation.current()?.organization.id !== current.organization.id || visitable.has(item.label)
    )

  return (
    <Show when={!wide()} fallback={<Navigate href={items()[0]?.href as string} />}>
      <AppShell title={t('appShell.nav.organizationSettings')}>
        <nav aria-label={t('appShell.nav.organizationSettings')}>
          <SettingsGroup items={items()} path={() => location.pathname} name={(label) => t(`appShell.nav.${label}`)} />
        </nav>
      </AppShell>
    </Show>
  )
}
