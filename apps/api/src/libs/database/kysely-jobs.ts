import { type Kysely, sql } from 'kysely'
import { newJob } from '#libs/jobs/new-job'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { EnqueueOptions, JobDefinition, JobQueue } from '#libs/ports/job-queue.port'
import type { ClaimedJob, Job, JobState, JobStore } from '#libs/ports/job-store.port'

type JobRow = {
  id: string
  kind: string
  payload: unknown
  state: JobState
  run_at: Date
  attempts: number
  locked_until: Date | null
  last_error: string | null
  created_at: Date
  finished_at: Date | null
}

type JobsDatabase = { job: JobRow }

/**
 * The job queue in Postgres through Kysely (ADR 0056), on the pool or on a unit of work's transaction
 * (ADR 0052): enqueued on a transaction, a job is kept or dropped with it. Every method is one
 * statement, so the worker holds no transaction and no connection while a handler runs.
 */
export class KyselyJobs implements JobQueue, JobStore {
  readonly #db: Kysely<JobsDatabase>
  readonly #ids: IdGenerator
  readonly #clock: Clock

  constructor(db: Kysely<unknown>, ids: IdGenerator, clock: Clock) {
    this.#db = db.withTables<JobsDatabase>()
    this.#ids = ids
    this.#clock = clock
  }

  async enqueue<Payload>(
    definition: JobDefinition<Payload>,
    payload: Payload,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const job = newJob(definition, payload, options, this.#ids.generate(), this.#clock.now())
    await this.#db
      .insertInto('job')
      .values({
        id: job.id,
        kind: job.kind,
        // As text: the driver would send an array payload as a Postgres array.
        payload: sql`${JSON.stringify(job.payload)}::jsonb`,
        state: job.state,
        run_at: job.runAt,
        attempts: job.attempts,
        locked_until: job.lockedUntil,
        last_error: job.lastError,
        created_at: job.createdAt,
        finished_at: job.finishedAt
      })
      .execute()
    return job.id
  }

  /**
   * One statement: the row lock of `for update skip locked` lasts only for it, and makes two workers
   * asking at once take different jobs. What keeps the job from the others afterwards is the lease.
   */
  async claim(now: Date, lockedUntil: Date): Promise<ClaimedJob | undefined> {
    const { rows } = await sql<ClaimedJob>`
      update job set attempts = attempts + 1, locked_until = ${lockedUntil}
      where id = (
        select id from job
        where state = 'pending' and run_at <= ${now} and (locked_until is null or locked_until <= ${now})
        order by run_at, id collate "C"
        limit 1
        for update skip locked
      )
      returning id, kind, payload, attempts
    `.execute(this.#db)
    return rows[0]
  }

  async complete(job: ClaimedJob, now: Date): Promise<void> {
    await this.#end(job, { state: 'done', finished_at: now })
  }

  async retry(job: ClaimedJob, runAt: Date, error: string): Promise<void> {
    await this.#end(job, { run_at: runAt, last_error: error })
  }

  async fail(job: ClaimedJob, now: Date, error: string): Promise<void> {
    await this.#end(job, { state: 'failed', finished_at: now, last_error: error })
  }

  async nextDueAt(): Promise<Date | undefined> {
    const row = await this.#db
      .selectFrom('job')
      .select(sql<Date | null>`min(greatest(run_at, coalesce(locked_until, run_at)))`.as('at'))
      .where('state', '=', 'pending')
      .executeTakeFirst()
    return row?.at ?? undefined
  }

  async find(id: string): Promise<Job | undefined> {
    const row = await this.#db.selectFrom('job').selectAll().where('id', '=', id).executeTakeFirst()
    if (!row) return undefined
    return {
      id: row.id,
      kind: row.kind,
      payload: row.payload,
      state: row.state,
      runAt: row.run_at,
      attempts: row.attempts,
      lockedUntil: row.locked_until,
      lastError: row.last_error,
      createdAt: row.created_at,
      finishedAt: row.finished_at
    }
  }

  /** Ends the attempt `job` names, unless the job has been claimed again since. */
  async #end(job: ClaimedJob, change: Partial<JobRow>): Promise<void> {
    await this.#db
      .updateTable('job')
      .set({ locked_until: null, ...change })
      .where('id', '=', job.id)
      .where('state', '=', 'pending')
      .where('attempts', '=', job.attempts)
      .execute()
  }
}

/**
 * How long a finished job is kept (ADR 0056): a done one long enough to answer "did it run?", a
 * failed one long enough for someone to see it and put it back. A product changes them here.
 */
export const jobRetention = { doneDays: 7, failedDays: 30 }

/** Rows deleted per statement, so a backlog never runs into the statement limit (ADR 0047). */
const BATCH_SIZE = 5000

const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

/**
 * Deletes the finished jobs past their keep, as of `now`, in batches, and returns how many went: the
 * queue's line in the daily purge (ADR 0050). Pending jobs are never touched.
 */
export async function purgeFinishedJobs(
  db: Kysely<unknown>,
  now: Date,
  { batchSize = BATCH_SIZE }: { batchSize?: number } = {}
): Promise<{ done: number; failed: number }> {
  const purge = async (state: JobState, before: Date) => {
    let total = 0
    for (;;) {
      const { numAffectedRows } = await sql`
        delete from job
        where id in (select id from job where state = ${state} and finished_at < ${before} limit ${batchSize})
      `.execute(db)
      const deleted = Number(numAffectedRows)
      total += deleted
      if (deleted < batchSize) return total
    }
  }
  return {
    done: await purge('done', daysBefore(now, jobRetention.doneDays)),
    failed: await purge('failed', daysBefore(now, jobRetention.failedDays))
  }
}
