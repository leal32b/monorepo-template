import type { Logger } from 'pino'
import type { Clock } from '#libs/ports/clock.port'
import type { ClaimedJob, JobStore } from '#libs/ports/job-store.port'
import type { Timer } from '#libs/ports/timer.port'
import { jobLimits, retryDelayMs } from './job-limits'
import type { JobRegistry } from './job-registry'

export type JobWorkerDeps = {
  store: JobStore
  registry: JobRegistry
  clock: Clock
  timer: Timer
  logger: Logger
  /** The longest an idle worker sleeps before it looks again; an enqueue in this process wakes it sooner. */
  idlePollMs: number
}

const MAX_ERROR_LENGTH = 1_000

/** What is kept of a failure, beside the log line: its message, never longer than the column is meant for. */
const messageOf = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH)

/**
 * Runs the jobs of a store, one at a time (ADR 0056). A job is taken for a lease, handed to the
 * handler of its kind, and then marked done, put back for a retry, or left as failed after its last
 * attempt. Delivery is at least once: a job may run again after a crash or a lost lease.
 *
 * `start()` keeps it going until `stop()`. An idle worker does not poll: it sleeps until the next
 * job is due, at most `idlePollMs`, and `nudge()` wakes it. Tests call `runNext()` or `drain()`.
 */
export class JobWorker {
  readonly #store: JobStore
  readonly #registry: JobRegistry
  readonly #clock: Clock
  readonly #timer: Timer
  readonly #logger: Logger
  readonly #idlePollMs: number
  /** Ends the sleep of the loop's current turn; a nudge during the turn's work ends it before it begins. */
  #wake = new AbortController()
  /** How many of the polls that follow a nudge have found nothing. */
  #wakePolls: number = jobLimits.wakePollsMs.length
  #loop: Promise<void> | undefined
  #stopping: Promise<void> | undefined

  constructor({ store, registry, clock, timer, logger, idlePollMs }: JobWorkerDeps) {
    this.#store = store
    this.#registry = registry
    this.#clock = clock
    this.#timer = timer
    this.#logger = logger
    this.#idlePollMs = idlePollMs
  }

  /** Takes the job due the longest and runs it. False when none is due. */
  async runNext(): Promise<boolean> {
    const now = this.#clock.now()
    const job = await this.#store.claim(now, new Date(now.getTime() + jobLimits.leaseMs))
    if (!job) return false

    const registration = this.#registry.find(job.kind)
    const failure = await this.#attempt(job, registration)
    const line = { jobId: job.id, kind: job.kind, attempt: job.attempts }
    const ended = this.#clock.now()
    // A payload that is a credential goes with the end of the job, not with the purge (ADR 0057).
    const end = { forgetPayload: registration?.definition.secretPayload === true }
    if (failure === undefined) {
      await this.#store.complete(job, ended, end)
      this.#logger.info({ ...line, durationMs: ended.getTime() - now.getTime() }, 'job done')
    } else if (job.attempts >= (registration?.definition.maxAttempts ?? jobLimits.maxAttempts)) {
      await this.#store.fail(job, ended, messageOf(failure.error), end)
      this.#logger.error({ ...line, err: failure.error }, 'job failed')
    } else {
      const retryAt = new Date(ended.getTime() + retryDelayMs(job.attempts))
      await this.#store.retry(job, retryAt, messageOf(failure.error))
      this.#logger.warn({ ...line, retryAt, err: failure.error }, 'job attempt failed')
    }
    return true
  }

  /** Runs every job due now: how a test lets the queue work. */
  async drain(): Promise<void> {
    while (await this.runNext());
  }

  /** Looks for work now, then whenever some is due, until `stop()`. */
  start(): void {
    if (this.#stopping || this.#loop) return
    this.#loop = this.#run()
  }

  /** Something was enqueued in this process: look now, and again shortly in case it is not committed yet. */
  nudge(): void {
    this.#wakePolls = 0
    this.#wake.abort()
  }

  /**
   * Stops taking jobs and waits for the one in hand, up to 10 s. A job still running then keeps its
   * lease and runs again once it ends. Every call returns the same promise.
   */
  stop(): Promise<void> {
    this.#stopping ??= this.#stop()
    return this.#stopping
  }

  async #stop(): Promise<void> {
    this.#wake.abort()
    if (!this.#loop) return
    const ended = new AbortController()
    await Promise.race([
      this.#loop.then(() => ended.abort()),
      this.#timer.wait(jobLimits.stopTimeoutMs, ended.signal).then(() => {
        if (ended.signal.aborted) return
        this.#logger.warn({ timeoutMs: jobLimits.stopTimeoutMs }, 'job still running at shutdown')
      })
    ])
  }

  async #run(): Promise<void> {
    while (!this.#stopping) {
      this.#wake = new AbortController()
      let sleep: number
      try {
        if (await this.runNext()) continue
        sleep = await this.#idleFor()
      } catch (err) {
        // The database is out of reach or slow (ADR 0047): not a reason to end the process.
        this.#logger.warn({ err }, 'job poll failed')
        sleep = jobLimits.pollRetryMs
      }
      if (!this.#stopping) await this.#timer.wait(sleep, this.#wake.signal)
    }
  }

  /** How long to sleep after finding nothing: until the next job is due, at most the idle time. */
  async #idleFor(): Promise<number> {
    const next = await this.#store.nextDueAt()
    const longest = jobLimits.wakePollsMs[this.#wakePolls] ?? this.#idlePollMs
    if (this.#wakePolls < jobLimits.wakePollsMs.length) this.#wakePolls += 1
    if (!next) return longest
    return Math.max(0, Math.min(next.getTime() - this.#clock.now().getTime(), longest))
  }

  /** One try at `job`: `undefined` when its handler ended well, otherwise what went wrong. */
  async #attempt(
    job: ClaimedJob,
    registration: ReturnType<JobRegistry['find']>
  ): Promise<{ error: unknown } | undefined> {
    const timeUp = new AbortController()
    const ended = new AbortController()
    try {
      if (!registration) throw new Error(`no handler for job kind ${job.kind}`)
      const payload = registration.definition.schema.safeParse(job.payload)
      if (!payload.success) throw new Error(`invalid payload for job kind ${job.kind}`, { cause: payload.error })
      await Promise.race([
        registration.handler(payload.data, { jobId: job.id, attempt: job.attempts, signal: timeUp.signal }),
        this.#timer.wait(jobLimits.handlerTimeoutMs, ended.signal).then(() => {
          if (ended.signal.aborted) return
          timeUp.abort()
          throw new Error(`job timed out after ${jobLimits.handlerTimeoutMs} ms`)
        })
      ])
      return undefined
    } catch (error) {
      return { error }
    } finally {
      ended.abort()
    }
  }
}
