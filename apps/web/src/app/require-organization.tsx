import type { OrganizationMembership } from '@repo/contracts'
import { useParams } from '@solidjs/router'
import { createEffect, createMemo, createResource, Match, type ParentProps, Switch } from 'solid-js'
import {
  CurrentOrganizationProvider,
  getMembership,
  type Organization,
  rememberOrganization,
  useOrganizations
} from '#entities/organizations'
import { NotFoundPage } from '#pages/not-found'
import { ApiError, useApi } from '#shared/api'
import { ShellSkeleton } from '#widgets/app-shell'
import { OrganizationsUnavailable } from './organizations-unavailable'

/**
 * The tenant screens under `/:orgSlug` (ADR 0034). The slug is looked up only among the user's own
 * organizations, so one that does not exist and one of somebody else's both show "not found", as the
 * API answers 404 for both. Then it asks the API what the caller may do there, and keeps the slug on
 * this device as the place `/` opens next time. If the address is changed on the screen, it stays on the
 * same organization while the URL catches up.
 */
export function RequireOrganization(props: ParentProps) {
  const params = useParams<{ orgSlug: string }>()
  const api = useApi()
  const { list, refetch } = useOrganizations()
  // A resource in error throws when read, so the list is read only once it is ready.
  const organization = createMemo<Organization | undefined>((previous) => {
    if (list.state !== 'ready') return undefined
    const organizations = list()
    const named = organizations.find((candidate) => candidate.slug === params.orgSlug)
    if (named || previous === undefined) return named
    // The address was just changed on this screen: the list has the new one while the URL still has
    // the old, for the moment the router takes to catch up. The same organization, by its id.
    const renamed = organizations.find((candidate) => candidate.id === previous.id)
    return renamed !== undefined && renamed.slug !== previous.slug ? renamed : undefined
  })
  const [membership, { refetch: refetchMembership }] = createResource(
    () => organization()?.id,
    (id) => getMembership(api, id)
  )

  createEffect(() => {
    if (membership.state === 'ready') rememberOrganization(params.orgSlug)
  })

  const missing = () =>
    (list.state === 'ready' && organization() === undefined) ||
    (membership.error instanceof ApiError && membership.error.status === 404)

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={list.error}>
        <OrganizationsUnavailable retry={refetch} />
      </Match>
      <Match when={missing()}>
        <NotFoundPage />
      </Match>
      <Match when={membership.error}>
        <OrganizationsUnavailable retry={() => void refetchMembership()} />
      </Match>
      <Match when={membership.state === 'ready' && organization()}>
        {(current) => (
          <CurrentOrganizationProvider organization={current()} membership={membership() as OrganizationMembership}>
            {props.children}
          </CurrentOrganizationProvider>
        )}
      </Match>
    </Switch>
  )
}
