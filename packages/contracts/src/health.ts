import { z } from 'zod'

/** `GET /api/health` */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  /** ISO 8601 time of the answer. */
  timestamp: z.iso.datetime()
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
