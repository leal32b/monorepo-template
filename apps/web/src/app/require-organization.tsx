import type { OrganizationMembership } from '@repo/contracts'
import { useParams } from '@solidjs/router'
import {
  type Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  type ParentProps,
  Suspense,
  Switch
} from 'solid-js'
import {
  CurrentOrganizationProvider,
  getMembership,
  membershipQuery,
  type Organization,
  ownOrganization,
  rememberOrganization,
  useOrganizations
} from '#entities/organizations'
import { NotFoundPage } from '#pages/not-found'
import { ApiError, useApi } from '#shared/api'
import { PageSkeleton, ShellSkeleton } from '#widgets/app-shell'
import { OrganizationsUnavailable } from './organizations-unavailable'

/**
 * The tenant screens under `/:orgSlug` (ADR 0034). The slug is looked up only among the user's own
 * organizations, so one that does not exist and one of somebody else's both show "not found", as the
 * API answers 404 for both. If the address is changed on the screen, it stays on the same organization
 * while the URL catches up.
 *
 * The screens are drawn anew for each organization (`OrganizationScreens`), so a screen leaving for
 * another one never reads it (W13), and moving to one never waits on what the caller may do there: its
 * skeleton holds the place in the frame until the API says (ADR 0038).
 *
 * While the organizations are read again (one deleted, left or joined), the list as last read stands
 * (W10): the screen on view stays, and an organization only the new list has waits for it in the frame,
 * where "not found" waits for the new list too.
 */
export function RequireOrganization(props: ParentProps) {
  const params = useParams<{ orgSlug: string }>()
  const { list, known, refetch } = useOrganizations()
  const organization = createMemo<Organization | undefined>((previous) => {
    const organizations = known()
    if (organizations === undefined) return undefined
    const named = organizations.find((candidate) => candidate.slug === params.orgSlug)
    if (named || previous === undefined) return named
    // The address was just changed on this screen: the list has the new one while the URL still has
    // the old, for the moment the router takes to catch up. The same organization, by its id.
    const renamed = organizations.find((candidate) => candidate.id === previous.id)
    return renamed !== undefined && renamed.slug !== previous.slug ? renamed : undefined
  })

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={list.error}>
        <OrganizationsUnavailable retry={refetch} />
      </Match>
      <Match when={list.state === 'ready' && organization() === undefined}>
        <NotFoundPage />
      </Match>
      <Match when={organization()?.id} keyed>
        {(id) => (
          <OrganizationScreens id={id} organization={organization}>
            {props.children}
          </OrganizationScreens>
        )}
      </Match>
      <Match when={list.state === 'refreshing'}>
        <PageSkeleton />
      </Match>
    </Switch>
  )
}

/**
 * The screens of one organization, and what the caller may do there, from the API's tenant guard
 * (ADR 0033). A membership read before in this session draws at once and is asked again behind it: a new
 * answer replaces the old, a 404 (no longer a member) shows "not found", and any other failure keeps what
 * is known. One not read yet is read under a boundary of its own, which shows the screen's skeleton in the
 * frame meanwhile; the organization is then kept on this device as the place `/` opens next time.
 */
function OrganizationScreens(props: ParentProps<{ id: string; organization: Accessor<Organization | undefined> }>) {
  const api = useApi()
  const { memberships } = useOrganizations()
  const shown = createMemo<Organization>(
    (last) => ownOrganization(props.id, props.organization(), last),
    props.organization() as Organization
  )
  const [held, setHeld] = createSignal(memberships.get(props.id))
  const [gone, setGone] = createSignal(false)

  /**
   * A first read goes through the router query, which a route's `preload` may have started already (one
   * request for both); the check behind a membership known before asks anew, past the router's few seconds.
   */
  const ask = (behind: boolean) =>
    (behind ? getMembership(api, props.id) : membershipQuery(api)(props.id)).then(
      (answer) => {
        memberships.set(props.id, answer)
        setHeld(answer)
        return answer
      },
      (failure: unknown) => {
        memberships.delete(props.id)
        if (failure instanceof ApiError && failure.status === 404) setGone(true)
        throw failure
      }
    )
  if (held() !== undefined) ask(true).catch(() => undefined)
  // Read only when nothing is known; reading it below waits under the boundary, with the skeleton.
  const [first, { refetch }] = createResource(
    () => held() === undefined && !gone(),
    () => ask(false)
  )

  createEffect(() => {
    if (held() !== undefined) rememberOrganization(shown().slug)
  })

  return (
    <Suspense fallback={<PageSkeleton organization={shown()} />}>
      <Switch>
        <Match when={gone()}>
          <NotFoundPage />
        </Match>
        <Match when={first.error}>
          <OrganizationsUnavailable retry={() => void refetch()} />
        </Match>
        <Match when={held() ?? first()}>
          <CurrentOrganizationProvider organization={shown()} membership={held() as OrganizationMembership}>
            {props.children}
          </CurrentOrganizationProvider>
        </Match>
      </Switch>
    </Suspense>
  )
}
