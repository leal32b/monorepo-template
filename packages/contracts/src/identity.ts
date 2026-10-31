import { z } from 'zod'

/** `GET /api/me`: the signed-in user. Without a session the API answers 401 `unauthenticated`. */
export const meResponseSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string()
})

export type MeResponse = z.infer<typeof meResponseSchema>

/** `GET /api/identity/options`: the sign-in methods this deploy offers, so the web shows only what works. */
export const identityOptionsSchema = z.object({
  /** Google sign-in: on when the API has its credentials (ADR 0020). */
  google: z.boolean()
})

export type IdentityOptions = z.infer<typeof identityOptionsSchema>

/**
 * How long a password may be: at least 15 characters when it is the only factor, with no composition
 * rules (NIST SP 800-63B-4). The API enforces it; the web says it before the user types.
 */
export const passwordLength = { min: 15, max: 128 } as const
