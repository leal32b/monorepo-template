import type { OrganizationMembership } from '@repo/contracts'
import { query } from '@solidjs/router'
import { createContext, createResource, type ParentProps, type Resource, useContext } from 'solid-js'
import { useAuth } from '#shared/api'
import type { Organization } from '../api/list-organizations'
import { organizationsQuery } from '../api/organizations-query'

type Organizations = {
  /** The signed-in user's organizations, read once for every screen below. */
  list: Resource<Organization[]>
  /** Reads them again, after a failure or a change such as a new organization. */
  refetch: () => void
  /** Puts a changed organization in the list (a new name or slug), with no new request. */
  update: (organization: Organization) => void
  /**
   * What the caller may do in each organization visited in this session, by its id, so going back to
   * one draws at once while the API is asked again behind it. Gone with the session.
   */
  memberships: Map<string, OrganizationMembership>
}

const OrganizationsContext = createContext<Organizations>()

/**
 * Reads the signed-in user's organizations once, for the screens below: the root redirect, the
 * tenant screens and the switcher (ADR 0034). Put up only behind the session guard, by a route that
 * started the same read at boot (ADR 0038); reading them again asks the API, not that first answer.
 */
export function OrganizationsProvider(props: ParentProps) {
  const auth = useAuth()
  const read = organizationsQuery(auth)
  const [list, { refetch, mutate }] = createResource(() => read())
  const memberships = new Map<string, OrganizationMembership>()

  return (
    <OrganizationsContext.Provider
      value={{
        list,
        refetch: () => {
          query.delete(read.keyFor())
          void refetch()
        },
        update: (changed) =>
          mutate((organizations) =>
            organizations?.map((organization) => (organization.id === changed.id ? changed : organization))
          ),
        memberships
      }}
    >
      {props.children}
    </OrganizationsContext.Provider>
  )
}

export function useOrganizations(): Organizations {
  const organizations = useContext(OrganizationsContext)
  if (!organizations) throw new Error('useOrganizations must be used inside an OrganizationsProvider')
  return organizations
}

/** The organizations of a screen that may sit outside the provider, such as the side menu on the account settings. */
export function useOptionalOrganizations(): Organizations | undefined {
  return useContext(OrganizationsContext)
}
