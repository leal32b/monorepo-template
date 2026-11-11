import type { EnqueueOptions, JobDefinition } from '#libs/ports/job-queue.port'
import type { Job } from '#libs/ports/job-store.port'

/**
 * The job an enqueue keeps (ADR 0056): pending, due at `runAt` or now. The payload is what the kind's
 * schema lets through; one that does not pass is a bug at the call, said there and not three retries later.
 */
export function newJob<Payload>(
  definition: JobDefinition<Payload>,
  payload: Payload,
  { runAt }: EnqueueOptions,
  id: string,
  now: Date
): Job {
  const parsed = definition.schema.safeParse(payload)
  if (!parsed.success) throw new Error(`invalid payload for job kind ${definition.kind}`, { cause: parsed.error })
  return {
    id,
    kind: definition.kind,
    payload: parsed.data,
    state: 'pending',
    runAt: runAt ?? now,
    attempts: 0,
    lockedUntil: null,
    lastError: null,
    createdAt: now,
    finishedAt: null
  }
}
