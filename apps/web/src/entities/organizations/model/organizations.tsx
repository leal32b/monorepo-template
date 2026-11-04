import { createContext, createResource, type ParentProps, type Resource, useContext } from 'solid-js'
import { useAuth } from '#shared/api'
import { listOrganizations, type Organization } from '../api/list-organizations'

type Organizations = {
  /** The signed-in user's organizations, read once for every screen below. */
  list: Resource<Organization[]>
  /** Reads them again, after a failure or a change such as a new organization. */
  refetch: () => void
}

const OrganizationsContext = createContext<Organizations>()

/**
 * Reads the signed-in user's organizations once, for the screens below: the root redirect, the
 * tenant screens and the switcher (ADR 0034). Put up only behind the session guard.
 */
export function OrganizationsProvider(props: ParentProps) {
  const auth = useAuth()
  const [list, { refetch }] = createResource(() => listOrganizations(auth))

  return (
    <OrganizationsContext.Provider value={{ list, refetch: () => void refetch() }}>
      {props.children}
    </OrganizationsContext.Provider>
  )
}

export function useOrganizations(): Organizations {
  const organizations = useContext(OrganizationsContext)
  if (!organizations) throw new Error('useOrganizations must be used inside an OrganizationsProvider')
  return organizations
}
