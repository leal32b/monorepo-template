import * as z from 'zod/mini'
import { FixedClock } from '#libs/adapters/fixed-clock'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { JobDefinition, JobQueue } from '#libs/ports/job-queue.port'
import type { ClaimedJob, JobStore } from '#libs/ports/job-store.port'

export const start = new Date('2026-11-11T09:00:00.000Z')
const after = (ms: number) => new Date(start.getTime() + ms)

/** Ids in the order they are drawn: `job-1`, `job-2`, … */
export class CountingIds implements IdGenerator {
  #count = 0

  generate(): string {
    this.#count += 1
    return `job-${this.#count}`
  }
}

export const greet: JobDefinition<{ name: string }> = {
  kind: 'test.greet',
  schema: z.object({ name: z.string().check(z.minLength(1)) })
}

/** What every job queue and store must do, run against the in-memory fake and the database adapter alike. */
export function describeJobs(
  label: string,
  make: (ids: IdGenerator, clock: FixedClock) => Promise<JobQueue & JobStore>
): void {
  describe(`${label} as a JobQueue and a JobStore`, () => {
    let clock: FixedClock
    let jobs: JobQueue & JobStore

    beforeEach(async () => {
      clock = new FixedClock(start)
      jobs = await make(new CountingIds(), clock)
    })

    /** The claim of a job the test knows to be due. */
    const take = async (now: Date, lockedUntil: Date) => {
      const claimed = await jobs.claim(now, lockedUntil)
      expect(claimed).toBeDefined()
      return claimed as ClaimedJob
    }

    it('keeps an enqueued job whole, pending and due now, and returns its id', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })

      expect(id).toBe('job-1')
      expect(await jobs.find(id)).toEqual({
        id: 'job-1',
        kind: 'test.greet',
        payload: { name: 'Ada' },
        state: 'pending',
        runAt: start,
        attempts: 0,
        lockedUntil: null,
        lastError: null,
        createdAt: start,
        finishedAt: null
      })
    })

    it('finds no job under an unknown id', async () => {
      expect(await jobs.find('nobody')).toBeUndefined()
    })

    it('refuses a payload that does not pass the schema of its kind, and keeps nothing', async () => {
      await expect(jobs.enqueue(greet, { name: '' })).rejects.toThrow('test.greet')

      expect(await jobs.nextDueAt()).toBeUndefined()
    })

    it('keeps only what the schema of the kind names', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada', extra: 'dropped' } as { name: string })

      expect((await jobs.find(id))?.payload).toEqual({ name: 'Ada' })
    })

    it('has nothing to claim when nothing was enqueued', async () => {
      expect(await jobs.claim(start, after(1_000))).toBeUndefined()
    })

    it('claims a due job for a lease and counts the attempt', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })

      const claimed = await jobs.claim(start, after(120_000))

      expect(claimed).toEqual({ id, kind: 'test.greet', payload: { name: 'Ada' }, attempts: 1 })
      expect(await jobs.find(id)).toMatchObject({ state: 'pending', attempts: 1, lockedUntil: after(120_000) })
    })

    it('does not claim a delayed job before its time, and claims it from then on', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' }, { runAt: after(60_000) })

      expect(await jobs.claim(after(59_999), after(180_000))).toBeUndefined()
      expect(await jobs.claim(after(60_000), after(180_000))).toMatchObject({ id })
    })

    it('does not claim a job another worker holds, until its lease ends', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })
      await jobs.claim(start, after(120_000))

      expect(await jobs.claim(after(119_999), after(240_000))).toBeUndefined()
      expect(await jobs.claim(after(120_000), after(240_000))).toMatchObject({ id, attempts: 2 })
    })

    it('gives a job to one of two workers that ask at once', async () => {
      await jobs.enqueue(greet, { name: 'Ada' })

      const claims = await Promise.all([jobs.claim(start, after(120_000)), jobs.claim(start, after(120_000))])

      expect(claims.filter(Boolean)).toHaveLength(1)
    })

    it('claims the job that has been due the longest first, then by id', async () => {
      await jobs.enqueue(greet, { name: 'second' }, { runAt: after(2_000) })
      await jobs.enqueue(greet, { name: 'third' }, { runAt: after(2_000) })
      await jobs.enqueue(greet, { name: 'first' }, { runAt: after(1_000) })

      const order = []
      for (let turn = 0; turn < 3; turn++) order.push((await jobs.claim(after(5_000), after(60_000)))?.id)

      expect(order).toEqual(['job-3', 'job-1', 'job-2'])
    })

    it('marks a completed job done, and never hands it out again', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })
      const claimed = await take(start, after(120_000))

      await jobs.complete(claimed, after(50))

      expect(await jobs.find(id)).toMatchObject({ state: 'done', finishedAt: after(50), lockedUntil: null })
      expect(await jobs.claim(after(500_000), after(600_000))).toBeUndefined()
    })

    it('puts a job to retry back in the queue for its new time, with the error', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })
      const claimed = await take(start, after(120_000))

      await jobs.retry(claimed, after(30_000), 'the provider said no')

      expect(await jobs.find(id)).toMatchObject({
        state: 'pending',
        runAt: after(30_000),
        attempts: 1,
        lockedUntil: null,
        lastError: 'the provider said no',
        finishedAt: null
      })
      expect(await jobs.claim(after(29_999), after(150_000))).toBeUndefined()
      expect(await jobs.claim(after(30_000), after(150_000))).toMatchObject({ id, attempts: 2 })
    })

    it('leaves a failed job in sight, and never hands it out again', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })
      const claimed = await take(start, after(120_000))

      await jobs.fail(claimed, after(50), 'still no')

      expect(await jobs.find(id)).toMatchObject({
        state: 'failed',
        lastError: 'still no',
        finishedAt: after(50),
        lockedUntil: null
      })
      expect(await jobs.claim(after(500_000), after(600_000))).toBeUndefined()
    })

    it('ignores a worker whose lease was taken over by another', async () => {
      const id = await jobs.enqueue(greet, { name: 'Ada' })
      const late = await take(start, after(120_000))
      await jobs.claim(after(120_000), after(240_000))

      await jobs.complete(late, after(130_000))
      await jobs.retry(late, after(160_000), 'late')
      await jobs.fail(late, after(130_000), 'late')

      expect(await jobs.find(id)).toMatchObject({
        state: 'pending',
        attempts: 2,
        runAt: start,
        lockedUntil: after(240_000),
        lastError: null
      })
    })

    it('says when the next job can be taken: its time, or the end of its lease', async () => {
      expect(await jobs.nextDueAt()).toBeUndefined()

      await jobs.enqueue(greet, { name: 'later' }, { runAt: after(90_000) })
      await jobs.enqueue(greet, { name: 'sooner' }, { runAt: after(60_000) })
      expect(await jobs.nextDueAt()).toEqual(after(60_000))

      const claimed = await take(after(60_000), after(75_000))
      expect(await jobs.nextDueAt()).toEqual(after(75_000))

      await jobs.complete(claimed, after(61_000))
      expect(await jobs.nextDueAt()).toEqual(after(90_000))
    })

    it('stamps a job with the time of the clock when it is enqueued', async () => {
      clock.advance(5_000)

      const id = await jobs.enqueue(greet, { name: 'Ada' })

      expect(await jobs.find(id)).toMatchObject({ createdAt: after(5_000), runAt: after(5_000) })
    })
  })
}
