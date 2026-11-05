import type { Organization } from '../api/list-organizations'

/**
 * The organization a set of screens was drawn for, given the one now in view: the same organization, by its
 * id, with its new name or address; otherwise the one they had, so screens leaving for another organization
 * never read it, even inside the router's transition, before they are gone (W13).
 */
export const ownOrganization = (id: string, now: Organization | undefined, last: Organization): Organization =>
  now?.id === id ? now : last
