export type JobState = 'pending' | 'done' | 'failed'

/** A job as it is kept (ADR 0056). */
export type Job = {
  id: string
  kind: string
  payload: unknown
  state: JobState
  /** Not before this instant: when it was asked for, or its next retry. */
  runAt: Date
  /** How many times a worker has taken it. */
  attempts: number
  /** While a worker holds it: the end of its lease. */
  lockedUntil: Date | null
  lastError: string | null
  createdAt: Date
  finishedAt: Date | null
}

/** What a worker holds while it runs a job: `attempts` names its turn. */
export type ClaimedJob = Pick<Job, 'id' | 'kind' | 'payload' | 'attempts'>

/**
 * What the worker needs from where jobs are kept (ADR 0056). A claim is a lease, not a lock: it ends
 * by itself at `lockedUntil`. `complete`, `retry` and `fail` change nothing when the job has been
 * claimed again since, so a worker that lost its lease cannot undo the one that took over.
 */
export interface JobStore {
  /** Takes the pending job that has been due the longest, if any, until `lockedUntil`. */
  claim(now: Date, lockedUntil: Date): Promise<ClaimedJob | undefined>
  complete(job: ClaimedJob, now: Date): Promise<void>
  /** Back to the queue for `runAt`, with why this attempt failed. */
  retry(job: ClaimedJob, runAt: Date, error: string): Promise<void>
  /** The last attempt failed: the job stays, as `failed`, for someone to see. */
  fail(job: ClaimedJob, now: Date, error: string): Promise<void>
  /** When the next pending job can be taken: its `runAt`, or the end of its lease. */
  nextDueAt(): Promise<Date | undefined>
  find(id: string): Promise<Job | undefined>
}
