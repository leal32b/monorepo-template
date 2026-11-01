import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'

/** `/settings/preferences`: how the app looks and speaks on this device. */
export function PreferencesPage() {
  const { t } = useI18n()

  return <AppShell title={t('preferences.title')} />
}
