import { Alert, Button } from '@repo/ui'
import { ErrorBoundary, type ParentProps } from 'solid-js'
import { useI18n } from '#shared/config'

/**
 * Where the reads of a part of a screen failed: what could not be read and a way to try again, the one
 * alert every screen shows for it (ADR 0038). Trying again draws the part anew, which asks the API again,
 * since a failed read is not kept; the rest of the screen stays as it is.
 */
export function ReadFailure(props: ParentProps<{ message: string }>) {
  const { t } = useI18n()
  return (
    <ErrorBoundary
      fallback={(_, retry) => (
        <Alert variant="error" action={<Button onClick={retry}>{t('actions.retry')}</Button>}>
          {props.message}
        </Alert>
      )}
    >
      {props.children}
    </ErrorBoundary>
  )
}
