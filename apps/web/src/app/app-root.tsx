import { useCurrentMatches } from '@solidjs/router'
import { createEffect, ErrorBoundary, type ParentProps } from 'solid-js'
import type { ErrorReporter, Requests } from '#shared/api'
import { AppFailure } from './app-failure'
import { NavigationProgress } from './navigation-progress'

/**
 * The root of the router: the progress bar (ADR 0035), and the one error boundary of the app (ADR 0072). A screen
 * that throws while it draws is reported, and the user sees `AppFailure` with the reference of the report, in
 * place of a blank page. The router's matched pattern is what a report names, never the address.
 */
export function AppRoot(props: ParentProps<{ requests: Requests; reporter: ErrorReporter }>) {
  const matches = useCurrentMatches()
  createEffect(() => props.reporter.setRoute(matches().at(-1)?.route.pattern ?? '/'))

  return (
    <>
      <NavigationProgress requests={props.requests} />
      <ErrorBoundary fallback={(error) => <AppFailure reference={props.reporter.report('render', error)} />}>
        {props.children}
      </ErrorBoundary>
    </>
  )
}
