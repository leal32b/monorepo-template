import * as z from 'zod/mini'
import type { JobDefinition } from '#libs/ports/job-queue.port'

/**
 * Ends an operator's visit at its time limit (ADR 0077), with its entry in the organization's trail, if
 * nobody ended it before; enqueued with the visit, to run at its expiry.
 */
export const endImpersonationJob: JobDefinition<{ impersonationId: string }> = {
  kind: 'back-office.end-impersonation',
  schema: z.object({ impersonationId: z.string() })
}
