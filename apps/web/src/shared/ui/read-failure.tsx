import { Alert, Button } from '@repo/ui'
import { Navigate, useLocation } from '@solidjs/router'
import { ErrorBoundary, type JSX, type ParentProps } from 'solid-js'
import { ApiError } from '#shared/api'
import { useI18n } from '#shared/config'

export type ReadFailureProps = ParentProps<{
  /** What could not be read, said in the one alert every screen shows for it, unless the screen says it its own way. */
  message?: string | undefined
  /** A screen that says a failure its own way, such as "not found", with what retries the read. */
  fallback?: ((error: unknown, retry: () => void) => JSX.Element) | undefined
}>

/**
 * Where the reads of a part of a screen failed: what could not be read and a way to try again, the one
 * alert every screen shows for it (ADR 0038). Trying again draws the part anew, which asks the API again,
 * since a failed read is not kept; the rest of the screen stays as it is. A read that found the session
 * ended sends the user to sign in, to come back here.
 */
export function ReadFailure(props: ReadFailureProps) {
  const { t } = useI18n()
  const location = useLocation()
  return (
    <ErrorBoundary
      fallback={(error, retry) => {
        if (error instanceof ApiError && error.status === 401) {
          return <Navigate href={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} />
        }
        return (
          props.fallback?.(error, retry) ?? (
            <Alert variant="error" action={<Button onClick={retry}>{t('actions.retry')}</Button>}>
              {props.message}
            </Alert>
          )
        )
      }}
    >
      {props.children}
    </ErrorBoundary>
  )
}
