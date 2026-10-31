import * as z from 'zod/mini'

const healthFields = {
  service: z.string(),
  /** ISO 8601 time of the answer. */
  timestamp: z.iso.datetime()
}

/**
 * `GET /api/health`: the API and its database (ADR 0014). `degraded` comes exactly when the
 * database is `down`, and is answered with HTTP 503.
 */
export const healthResponseSchema = z.discriminatedUnion('status', [
  z.object({ ...healthFields, status: z.literal('ok'), database: z.literal('up') }),
  z.object({ ...healthFields, status: z.literal('degraded'), database: z.literal('down') })
])

export type HealthResponse = z.infer<typeof healthResponseSchema>

/** `GET /api/health/live`: the process answers. No I/O, so platform checks never wake the database. */
export const livenessResponseSchema = z.object({ status: z.literal('ok') })

export type LivenessResponse = z.infer<typeof livenessResponseSchema>
