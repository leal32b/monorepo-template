import type * as z from 'zod/mini'

/**
 * One kind of background work (ADR 0056): the name its handler is registered under, written
 * `module.what-it-does`, and the schema its payload must pass when enqueued and before it runs.
 * The payload is stored as JSON: plain values only, ids rather than whole records.
 */
export type JobDefinition<Payload> = {
  kind: string
  schema: z.ZodMiniType<Payload>
  /** How many times a worker tries before the job is left as `failed`; 5 when unset. */
  maxAttempts?: number
  /**
   * The payload is a credential, such as an emailed link with a token (ADR 0057): it is kept for the
   * retries and set to `null` by the write that ends the job, done or failed, rather than until the purge.
   */
  secretPayload?: boolean
}

export type EnqueueOptions = {
  /** Not before this instant: a reminder, a follow-up. Unset means now. */
  runAt?: Date
}

/**
 * Where a use case leaves work to be done after it answers (ADR 0056). Built on a unit of work's
 * transaction, the job is kept or dropped with the change that causes it (ADR 0052).
 */
export interface JobQueue {
  /** Stores the job and returns its id. Throws when the payload does not pass the kind's schema. */
  enqueue<Payload>(definition: JobDefinition<Payload>, payload: Payload, options?: EnqueueOptions): Promise<string>
}

export type JobContext = {
  jobId: string
  /** 1 on the first run. */
  attempt: number
  /** Aborts when the handler's time is up: pass it to whatever the handler waits on. */
  signal: AbortSignal
}

/**
 * Does one job. It may run more than once for the same job (a crash, a lost lease), so it must be
 * idempotent; throwing asks for a retry.
 */
export type JobHandler<Payload> = (payload: Payload, context: JobContext) => Promise<void>

/** What a module's `registerXJobs` receives: where it names the handler of each of its kinds. */
export interface JobRegistrar {
  register<Payload>(definition: JobDefinition<Payload>, handler: JobHandler<Payload>): void
}
