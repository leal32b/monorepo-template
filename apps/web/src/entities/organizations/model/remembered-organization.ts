import { readStored, store } from '#shared/config'
import type { Organization } from '../api/list-organizations'

const KEY = 'organization'

/** Keeps on this device the organization last opened (ADR 0034): a convenience, never a source of truth. */
export function rememberOrganization(slug: string): void {
  store(KEY, slug)
}

/**
 * Where `/` goes: the organization last opened on this device when the user is still in it, otherwise
 * the first one; `undefined` when the user has none.
 */
export function startingOrganization(organizations: readonly Organization[]): Organization | undefined {
  const remembered = readStored(KEY)
  return organizations.find((organization) => organization.slug === remembered) ?? organizations[0]
}
