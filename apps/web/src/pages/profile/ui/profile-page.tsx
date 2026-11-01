import { SettingsRow, SettingsSection } from '@repo/ui'
import { useSession } from '#entities/sessions'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

/** `/settings/profile`: who the user is, as the app and its emails show it. */
export function ProfilePage() {
  const { t } = useI18n()
  const user = useSession()

  return (
    <AppShell title={t('profile.title')}>
      <SettingsSection title={t('profile.details.title')} description={t('profile.details.description')}>
        <SettingsRow icon="profile" title={t('profile.details.name')} description={user.name} />
        <SettingsRow letter="@" title={t('profile.details.email')} description={user.email} />
      </SettingsSection>
    </AppShell>
  )
}
