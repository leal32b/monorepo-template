import type { IncomingMessage } from 'node:http'
import type * as z from 'zod/mini'
import { HttpProblem } from './problem'

/**
 * The query string, checked against a schema from `@repo/contracts`, like `readValidJson` for a body.
 * A mismatch is a 400 that lists each invalid parameter. The schema decides what is unknown.
 */
export function readValidQuery<Schema extends z.ZodMiniType>(req: IncomingMessage, schema: Schema): z.output<Schema> {
  const params = new URL(req.url as string, 'http://localhost').searchParams
  const result = schema.safeParse(Object.fromEntries(params))
  if (result.success) return result.data
  throw new HttpProblem(400, 'validation_failed', {
    detail: 'The query string does not match the expected shape.',
    errors: result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }))
  })
}
