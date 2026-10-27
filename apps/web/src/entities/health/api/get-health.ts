import { healthResponseSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** `GET /api/health`: the client validates the answer against the contract, including a 503 `degraded` one. */
export const getHealth = (client: ApiClient) => client.get('/api/health', healthResponseSchema, { accept: [503] })
