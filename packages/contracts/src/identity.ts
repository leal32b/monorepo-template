import { z } from 'zod'

/** `GET /api/me`: the signed-in user. Without a session the API answers 401 `unauthenticated`. */
export const meResponseSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string()
})

export type MeResponse = z.infer<typeof meResponseSchema>
