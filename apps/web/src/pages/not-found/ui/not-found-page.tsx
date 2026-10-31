import { buttonVariants } from '@repo/ui'
import { A } from '@solidjs/router'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * Any address the app does not have: it says so, instead of a blank page, with the way back to the
 * start, which sends a visitor without a session on to sign in.
 */
export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <EntryLayout title={t('notFound.title')} description={t('notFound.description')}>
      <A href="/" class={buttonVariants({ variant: 'primary', class: 'w-full' })}>
        {t('notFound.home')}
      </A>
    </EntryLayout>
  )
}
