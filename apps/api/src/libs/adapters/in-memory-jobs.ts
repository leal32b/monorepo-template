import { newJob } from '#libs/jobs/new-job'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { EnqueueOptions, JobDefinition, JobQueue } from '#libs/ports/job-queue.port'
import type { ClaimedJob, Job, JobStore } from '#libs/ports/job-store.port'
import type { InMemoryStore } from './in-memory-unit-of-work'

/**
 * The job queue for use-case tests (ADR 0056), under the same contract suite as the database adapter.
 * A test reads `all` to see what a use case enqueued, or runs the jobs with a worker's `drain()`.
 */
export class InMemoryJobs implements JobQueue, JobStore, InMemoryStore {
  #jobs = new Map<string, Job>()
  readonly #ids: IdGenerator
  readonly #clock: Clock

  constructor(ids: IdGenerator, clock: Clock) {
    this.#ids = ids
    this.#clock = clock
  }

  /** Every job kept, in the order they were enqueued. */
  get all(): Job[] {
    return [...this.#jobs.values()]
  }

  snapshot(): () => void {
    const before = new Map(this.#jobs)
    return () => {
      this.#jobs = before
    }
  }

  async enqueue<Payload>(
    definition: JobDefinition<Payload>,
    payload: Payload,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const job = newJob(definition, payload, options, this.#ids.generate(), this.#clock.now())
    this.#jobs.set(job.id, job)
    return job.id
  }

  async claim(now: Date, lockedUntil: Date): Promise<ClaimedJob | undefined> {
    const [job] = this.all
      .filter((candidate) => candidate.state === 'pending' && dueAt(candidate) <= now)
      .sort((a, b) => a.runAt.getTime() - b.runAt.getTime() || byId(a.id, b.id))
    if (!job) return undefined
    const claimed = { ...job, attempts: job.attempts + 1, lockedUntil }
    this.#jobs.set(job.id, claimed)
    return { id: claimed.id, kind: claimed.kind, payload: claimed.payload, attempts: claimed.attempts }
  }

  async complete(job: ClaimedJob, now: Date): Promise<void> {
    this.#end(job, { state: 'done', finishedAt: now })
  }

  async retry(job: ClaimedJob, runAt: Date, error: string): Promise<void> {
    this.#end(job, { runAt, lastError: error })
  }

  async fail(job: ClaimedJob, now: Date, error: string): Promise<void> {
    this.#end(job, { state: 'failed', finishedAt: now, lastError: error })
  }

  async nextDueAt(): Promise<Date | undefined> {
    const times = this.all.filter((job) => job.state === 'pending').map((job) => dueAt(job).getTime())
    return times.length > 0 ? new Date(Math.min(...times)) : undefined
  }

  async find(id: string): Promise<Job | undefined> {
    return this.#jobs.get(id)
  }

  /** Ends the attempt `job` names, unless the job has been claimed again since. */
  #end(job: ClaimedJob, change: Partial<Job>): void {
    const kept = this.#jobs.get(job.id)
    if (kept?.state !== 'pending' || kept.attempts !== job.attempts) return
    this.#jobs.set(job.id, { ...kept, lockedUntil: null, ...change })
  }
}

/**
 * When a pending job can be taken: its time, or the end of the lease a worker holds on it (a lease
 * always ends after the job's time, since only a due job is claimed).
 */
const dueAt = (job: Job) => job.lockedUntil ?? job.runAt

/** Plain code-unit order, as the adapter's `collate "C"`. */
const byId = (a: string, b: string) => Number(a > b) - Number(a < b)
