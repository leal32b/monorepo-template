import { type Action, can, type OrganizationMembership, type Resource } from '@repo/contracts'
import { createContext, type ParentProps, useContext } from 'solid-js'
import type { Organization } from '../api/list-organizations'

export type CurrentOrganization = {
  organization: Organization
  membership: OrganizationMembership
  /** Whether the caller's roles hold `action` on `resource`, as the API resolved them. */
  can: <R extends Resource>(resource: R, action: Action<R>) => boolean
}

const CurrentOrganizationContext = createContext<CurrentOrganization>()

/** Gives the tenant screens below the organization in the URL and what the caller may do in it. */
export function CurrentOrganizationProvider(
  props: ParentProps<{ organization: Organization; membership: OrganizationMembership }>
) {
  const value: CurrentOrganization = {
    get organization() {
      return props.organization
    },
    get membership() {
      return props.membership
    },
    can: (resource, action) => can(props.membership.permissions, resource, action)
  }

  return <CurrentOrganizationContext.Provider value={value}>{props.children}</CurrentOrganizationContext.Provider>
}

/** The organization of a tenant screen; only the tenant routes put one up. */
export function useOrganization(): CurrentOrganization {
  const current = useContext(CurrentOrganizationContext)
  if (!current) throw new Error('useOrganization must be used inside a CurrentOrganizationProvider')
  return current
}

/** The organization of the screen, or `undefined` on a screen outside any, such as the account settings. */
export function useCurrentOrganization(): CurrentOrganization | undefined {
  return useContext(CurrentOrganizationContext)
}

/** Where an organization's home is (ADR 0034); outside any organization, the root picks one. */
export function homeOf(organization: Organization | undefined): string {
  return organization === undefined ? '/' : `/${organization.slug}`
}
