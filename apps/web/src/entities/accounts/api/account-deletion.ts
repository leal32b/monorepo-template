import { accountDeletionSchema } from '@repo/contracts'
import { type ApiClient, createQuery } from '#shared/api'

/** `GET /api/me/account-deletion`: what deleting the account would do to each organization (ADR 0049). */
export const getAccountDeletion = (api: ApiClient) => api.get('/api/me/account-deletion', accountDeletionSchema)

/**
 * What deleting the account would do, as a router query (ADR 0038): the profile and the confirmation
 * screens read it, and their routes start it.
 */
export const accountDeletionQuery = (api: ApiClient) => createQuery(() => getAccountDeletion(api), 'account-deletion')
