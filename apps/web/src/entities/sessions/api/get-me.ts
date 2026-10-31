import { meResponseSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** `GET /api/me`: who is signed in; without a session the API answers 401 and the client throws. */
export const getMe = (client: ApiClient) => client.get('/api/me', meResponseSchema)
