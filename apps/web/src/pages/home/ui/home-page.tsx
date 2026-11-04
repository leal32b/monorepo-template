import { buttonVariants, SettingsRow, SettingsSection } from '@repo/ui'
import { A } from '@solidjs/router'
import { Show } from 'solid-js'
import { homeOf, useCurrentOrganization } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

/**
 * `/:orgSlug`: the first screen behind the sign-in, in the app frame. Getting started holds what the
 * organization still needs to be useful; for now, inviting the team, offered to whoever may invite.
 */
export function HomePage() {
  const { t } = useI18n()
  const current = useCurrentOrganization()

  return (
    <AppShell title={t('home.title')}>
      <Show when={current?.can('invitation', 'create') ? current : undefined}>
        {(organization) => (
          <SettingsSection
            title={t('home.gettingStarted.title')}
            description={t('home.gettingStarted.description', { name: organization().organization.name })}
          >
            <SettingsRow
              icon="users"
              title={t('home.gettingStarted.invite.title')}
              description={t('home.gettingStarted.invite.description', { name: organization().organization.name })}
              action={
                <A href={`${homeOf(organization().organization)}/settings/members`} class={buttonVariants()}>
                  {t('home.gettingStarted.invite.go')}
                </A>
              }
            />
          </SettingsSection>
        )}
      </Show>
    </AppShell>
  )
}
