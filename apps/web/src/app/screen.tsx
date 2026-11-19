import type { RoutePreloadFuncArgs, RouteSectionProps } from '@solidjs/router'
import { type Component, createResource, type ParentProps, Show } from 'solid-js'
import { type Group, hasGroups, loadGroups, useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'

/**
 * Keeps a screen from drawing before its words are there (ADR 0071). When the groups are loaded already, as on
 * every visit after the first, it draws at once and waits for nothing. Otherwise the fetch is read under the
 * nearest `Suspense`, which keeps the page on view or draws the skeleton, as for a screen's code (ADR 0038); a
 * fetch that fails says so through `ReadFailure`, with a way to try again.
 */
export function WithTexts(props: ParentProps<{ groups: readonly Group[] }>) {
  const { t } = useI18n()
  if (hasGroups(props.groups)) return props.children
  return (
    <ReadFailure message={t('failure.texts')}>
      <Arrival groups={props.groups}>{props.children}</Arrival>
    </ReadFailure>
  )
}

function Arrival(props: ParentProps<{ groups: readonly Group[] }>) {
  const [arrived] = createResource(() => loadGroups(props.groups).then(() => true))
  return <Show when={arrived()}>{props.children}</Show>
}

/**
 * A route for a screen that has words of its own to fetch: the screen, drawn once they are there, and a
 * `preload` that starts the fetch as the router opens the route, beside the screen's reads (ADR 0038). The
 * fetch starts for a link only hovered too: words are code, not data, and the reads decide for themselves
 * (ADR 0040). A screen with no groups of its own is the route it was.
 */
export function screenOf<Page extends Component<RouteSectionProps>>(
  page: Page,
  groups: readonly Group[],
  reads?: (args: RoutePreloadFuncArgs) => void
): { component: Component<RouteSectionProps>; preload: (args: RoutePreloadFuncArgs) => void } {
  const component =
    groups.length === 0 ? page : (props: RouteSectionProps) => <WithTexts groups={groups}>{page(props)}</WithTexts>
  return {
    component,
    preload: (args) => {
      // A failure is said by the screen when it draws, which asks again.
      loadGroups(groups).catch(() => undefined)
      reads?.(args)
    }
  }
}
