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
 */
export function RequireOrganization(props: ParentProps) {
  const params = useParams<{ orgSlug: string }>()
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

  const ask = () =>
    getMembership(api, props.id).then(
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
  if (held() !== undefined) ask().catch(() => undefined)
  // Read only when nothing is known; reading it below waits under the boundary, with the skeleton.
  const [first, { refetch }] = createResource(() => held() === undefined && !gone(), ask)

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
