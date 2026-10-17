import { healthResponseSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** `GET /api/health`: the answer is validated against the contract by the client. */
export const getHealth = (client: ApiClient) => client.get('/api/health', healthResponseSchema)
