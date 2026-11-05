import { ProgressBar } from '@repo/ui'
import { useIsRouting } from '@solidjs/router'
import type { Requests } from '#shared/api'

/**
 * The one progress bar of the app (ADR 0035), at the root of the router: it shows while a request is
 * out, and while a navigation waits on something that is not a request, such as a screen's code (ADR 0038).
 */
export function NavigationProgress(props: { requests: Requests }) {
  const routing = useIsRouting()
  return <ProgressBar active={routing() || props.requests.busy()} />
}
