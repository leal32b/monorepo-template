import * as z from 'zod/mini'

/** Where a report came from: a screen that threw while it drew, an uncaught error, or an uncaught rejection. */
export const clientErrorKinds = ['render', 'error', 'unhandledrejection'] as const

export const clientErrorLimits = { message: 500, stack: 4000, route: 200, release: 64, reference: 64 } as const

/**
 * `POST /api/client-errors` (ADR 0072): what the browser says about an error it could not handle. Every field
 * has a length, and the route is a router *pattern* (`/:organizationSlug/customers/:customerId`), whose
 * characters the schema holds to, so an address with a query or a fragment is refused. Nothing a user typed,
 * no address, no id: only what finds the line again (`reference`) and the commit that threw (`release`).
 */
export const clientErrorReportSchema = z.object({
  kind: z.enum(clientErrorKinds),
  message: z.string().check(z.minLength(1), z.maxLength(clientErrorLimits.message)),
  stack: z.optional(z.string().check(z.maxLength(clientErrorLimits.stack))),
  route: z.string().check(z.maxLength(clientErrorLimits.route), z.regex(/^\/[A-Za-z0-9_:*.\-/]*$/)),
  release: z.string().check(z.maxLength(clientErrorLimits.release), z.regex(/^[A-Za-z0-9._-]+$/)),
  reference: z.string().check(z.maxLength(clientErrorLimits.reference), z.regex(/^[A-Za-z0-9_-]{8,}$/))
})

export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>
