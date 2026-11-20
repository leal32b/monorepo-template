import type { BackOfficeOrganization } from '@repo/contracts'
import { Badge } from '@repo/ui'
import { useI18n } from '#shared/config'

/** The subscription's state in a word, and "read only" when it is. */
export function StatusBadge(props: {
  subscription: Pick<BackOfficeOrganization['subscription'], 'status' | 'access'>
}) {
  const { t } = useI18n()
  return (
    <Badge>
      {t(`backOffice.status.${props.subscription.status}`)}
      {props.subscription.access === 'read-only' ? ` · ${t('backOffice.status.readOnly')}` : ''}
    </Badge>
  )
}
