import { Navigate } from '@solidjs/router'
import { Match, Switch } from 'solid-js'
import { homeOf, startingOrganization, useOrganizations } from '#entities/organizations'
import { ShellSkeleton } from '#widgets/app-shell'
import { OrganizationsUnavailable } from './organizations-unavailable'

/**
 * `/`: the start of the app for someone signed in (ADR 0034). It goes to the organization last opened
 * on this device, or the first one, and to onboarding for someone without any (D4). The old address
 * leaves the history, so Back does not land here again.
 */
export function OrganizationRedirect() {
  const { list, refetch } = useOrganizations()

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={list.error}>
        <OrganizationsUnavailable retry={refetch} />
      </Match>
      <Match when={list.state === 'ready' && list()}>
        {(organizations) => {
          const start = startingOrganization(organizations())
          return <Navigate href={start === undefined ? '/onboarding' : homeOf(start)} />
        }}
      </Match>
    </Switch>
  )
}
