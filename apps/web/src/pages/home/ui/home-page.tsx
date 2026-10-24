import { useI18n } from '#shared/config'
import { ApiStatus } from '#widgets/api-status'

export function HomePage() {
  const { t } = useI18n()

  return (
    <main>
      <h1>{t('home.title')}</h1>
      <ApiStatus />
    </main>
  )
}
