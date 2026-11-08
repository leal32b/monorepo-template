import * as z from 'zod/mini'

/** `GET /api/me`: the signed-in user. Without a session the API answers 401 `unauthenticated`. */
export const meResponseSchema = z.object({
  id: z.string().check(z.minLength(1)),
  email: z.email(),
  name: z.string()
})

export type MeResponse = z.infer<typeof meResponseSchema>

/**
 * What deleting the account does to each organization the user is in (ADR 0049): one where they are
 * the only member is `deleted` with them, one they share is `left`, and one where they are the only
 * owner beside other members is `blocked` until they make someone else an owner or delete it.
 */
const accountDeletionOutcomes = ['deleted', 'left', 'blocked'] as const

export type AccountDeletionOutcome = (typeof accountDeletionOutcomes)[number]

/** `GET /api/me/account-deletion`: the organizations of the signed-in user, by name, and what happens to each. */
export const accountDeletionSchema = z.object({
  organizations: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string(), outcome: z.enum(accountDeletionOutcomes) })
  )
})

export type AccountDeletion = z.infer<typeof accountDeletionSchema>

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
