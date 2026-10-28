import { useI18n } from '#shared/config'
import { ApiStatus } from '#widgets/api-status'

export function HomePage() {
  const { t } = useI18n()

  return (
    <main class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 class="text-3xl font-semibold">{t('home.title')}</h1>
      <ApiStatus />
    </main>
  )
}
