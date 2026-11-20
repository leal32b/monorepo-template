import * as z from 'zod/mini'
import { entitlementKeySchema } from './billing'

/**
 * Why an operator's session may not open the back office: two-step verification is off, the account signs in
 * another way than its password (Google asks for no code), or the session is older than the grant or than
 * `the back office's limit (ADR 0077)`.
 */
export const operatorSessionRefusals = ['two-factor', 'sign-in-method', 'sign-in-again'] as const

export type OperatorSessionRefusal = (typeof operatorSessionRefusals)[number]

/**
 * Every error response (`application/problem+json`, RFC 9457). Clients switch on `code`,
 * the stable machine-readable reason; `type` is the same reason as a URN.
 */
export const apiProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int().check(z.gte(400), z.lte(599)),
  code: z.string(),
  detail: z.optional(z.string()),
  /** One entry per invalid field of the request. */
  errors: z.optional(z.array(z.object({ path: z.string(), message: z.string() }))),
  /** Seconds to wait before trying again, same as the `Retry-After` header: a 429 carries it (ADR 0059). */
  retryAfter: z.optional(z.int().check(z.minimum(1))),
  /** The capability or limit that refused: `plan_required` and `plan_limit_reached` carry it (ADR 0063). */
  entitlement: z.optional(entitlementKeySchema),
  /** The plan's number for the limit that `plan_limit_reached` names. */
  limit: z.optional(z.int().check(z.gte(0))),
  /** Why `operator_session_refused` refused an operator's session (ADR 0077). */
  reason: z.optional(z.enum(operatorSessionRefusals)),
  /** Same as the `X-Request-Id` header, to find the request in the API log. */
  requestId: z.optional(z.string())
})

export type ApiProblem = z.infer<typeof apiProblemSchema>
