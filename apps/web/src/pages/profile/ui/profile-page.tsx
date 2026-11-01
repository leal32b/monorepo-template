import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

/** `/settings/profile`: who the user is, the first of the settings. */
export function ProfilePage() {
  const { t } = useI18n()

  return <AppShell title={t('profile.title')} />
}
