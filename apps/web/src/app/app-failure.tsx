import { Alert, Button } from '@repo/ui'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * What the app shows when a screen throws while it draws (ADR 0072): that it stopped, the reference to quote to
 * support in the line every failure uses, and a way to start over. The error is in the log under the reference.
 */
export function AppFailure(props: { reference: string | undefined }) {
  const { t } = useI18n()

  return (
    <EntryLayout title={t('failure.crashedTitle')}>
      <Alert
        variant="error"
        reference={
          props.reference === undefined
            ? undefined
            : t('failure.reference', { reference: `client_error · ${props.reference}` })
        }
        action={<Button onClick={() => window.location.reload()}>{t('failure.reload')}</Button>}
      >
        {t('failure.crashed')}
      </Alert>
    </EntryLayout>
  )
}
