import { Button } from '@repo/ui'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/** The organizations, or one organization's permissions, could not be read: what happened, and a retry. */
export function OrganizationsUnavailable(props: { retry: () => void }) {
  const { t } = useI18n()

  return (
    <EntryLayout title={t('organizations.unavailable.title')} description={t('organizations.unavailable.description')}>
      <Button variant="primary" class="w-full" onClick={() => props.retry()}>
        {t('organizations.unavailable.retry')}
      </Button>
    </EntryLayout>
  )
}
