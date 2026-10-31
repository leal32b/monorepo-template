import { useI18n } from '#shared/config'
import { ApiStatus } from '#widgets/api-status'
import { AppShell } from '#widgets/app-shell'

/** `/`: the first screen behind the sign-in, in the app frame. */
export function HomePage() {
  const { t } = useI18n()

  return (
    <AppShell title={t('home.title')}>
      <ApiStatus />
    </AppShell>
  )
}
