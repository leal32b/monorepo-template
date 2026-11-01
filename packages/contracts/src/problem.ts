import * as z from 'zod/mini'

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
  /** Same as the `X-Request-Id` header, to find the request in the API log. */
  requestId: z.optional(z.string())
})

export type ApiProblem = z.infer<typeof apiProblemSchema>
