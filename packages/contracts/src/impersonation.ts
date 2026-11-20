import * as z from 'zod/mini'
import { currencySchema } from './money'
import { instantSchema, timeZoneSchema } from './time'

/**
 * An operator's visit to an organization (ADR 0077), apart from the back office's lists: every signed-in screen
 * of an operator's device reads it, so it carries none of their weight.
 */
/** An operator's visit to an organization, until `endsAt` (ADR 0077). */
export const impersonationSchema = z.object({
  /** What the tenant screens draw it with, as Better Auth's list gives a member's organizations. */
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    timeZone: timeZoneSchema,
    currency: currencySchema
  }),
  startedAt: instantSchema,
  endsAt: instantSchema
})

export type Impersonation = z.infer<typeof impersonationSchema>

/** `GET /api/admin/impersonation`: the operator's visit now, or `null`. */
export const currentImpersonationSchema = z.object({ impersonation: z.nullable(impersonationSchema) })

export type CurrentImpersonation = z.infer<typeof currentImpersonationSchema>
