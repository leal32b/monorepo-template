import { Navigate } from '@solidjs/router'
import { Match, Switch } from 'solid-js'
import { homeOf, startingOrganization, useOrganizations } from '#entities/organizations'
import { PageSkeleton, ShellSkeleton } from '#widgets/app-shell'
import { OrganizationsUnavailable } from './organizations-unavailable'

/**
 * `/`: the start of the app for someone signed in (ADR 0034). It goes to the organization last opened
 * on this device, or the first one, and to onboarding for someone without any (D4). The old address
 * leaves the history, so Back does not land here again.
 *
 * It sits in the frame (ADR 0039), which it keeps while it decides: the organization's skeleton holds the
 * place until its screen is drawn, and while the organizations are read again (one just created, deleted
 * or left), a skeleton waits for the new list. The first read, before anything is drawn, waits as the
 * session does.
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
          return start === undefined ? (
            <Navigate href="/onboarding" />
          ) : (
            <>
              <Navigate href={homeOf(start)} />
              <PageSkeleton organization={start} />
            </>
          )
        }}
      </Match>
      <Match when={list.state === 'refreshing'}>
        <PageSkeleton />
      </Match>
    </Switch>
  )
}
