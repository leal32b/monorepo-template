import { z } from 'zod'

/**
 * Every error response (`application/problem+json`, RFC 9457). Clients switch on `code`,
 * the stable machine-readable reason; `type` is the same reason as a URN.
 */
export const apiProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int().min(400).max(599),
  code: z.string(),
  detail: z.string().optional(),
  /** One entry per invalid field of the request. */
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  /** Same as the `X-Request-Id` header, to find the request in the API log. */
  requestId: z.string().optional()
})

export type ApiProblem = z.infer<typeof apiProblemSchema>
