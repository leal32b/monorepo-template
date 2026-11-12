import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import type { JobContext } from '#libs/ports/job-queue.port'
import { jobLimits } from './job-limits'
import { JobRegistry } from './job-registry'
import { JobWorker } from './job-worker'
import { CountingIds, greet, start } from './testing/jobs.contract'
import { memoryLogger } from './testing/memory-logger'

const IDLE = 3_600_000
const after = (ms: number) => new Date(start.getTime() + ms)

function setup() {
  const clock = new FixedClock(start)
  const timer = new ManualTimer(clock)
  const jobs = new InMemoryJobs(new CountingIds(), clock)
  const registry = new JobRegistry()
  const { logger, lines } = memoryLogger()
  const worker = new JobWorker({ store: jobs, registry, clock, timer, logger, idlePollMs: IDLE })
  return { clock, timer, jobs, registry, lines, worker }
}

describe('JobWorker running a job (ADR 0056)', () => {
  it('hands the handler the payload and the attempt, marks the job done and says so', async () => {
    const { jobs, registry, worker, lines } = setup()
    const seen: unknown[] = []
    registry.register(greet, async (payload, { jobId, attempt }) => {
      seen.push({ payload, jobId, attempt })
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    expect(await worker.runNext()).toBe(true)

    expect(seen).toEqual([{ payload: { name: 'Ada' }, jobId: 'job-1', attempt: 1 }])
    expect(jobs.all).toMatchObject([{ state: 'done', attempts: 1, finishedAt: start }])
    expect(lines).toEqual([
      { level: 30, jobId: 'job-1', kind: 'test.greet', attempt: 1, durationMs: 0, msg: 'job done' }
    ])
  })

  it('has nothing to run when no job is due', async () => {
    const { jobs, registry, worker } = setup()
    registry.register(greet, async () => {})
    await jobs.enqueue(greet, { name: 'Ada' }, { runAt: after(60_000) })

    expect(await worker.runNext()).toBe(false)
  })

  it('never logs the payload', async () => {
    const { jobs, registry, worker, lines } = setup()
    registry.register(greet, async () => {
      throw new Error('no')
    })
    await jobs.enqueue(greet, { name: 'Ada Lovelace' })

    await worker.runNext()

    expect(JSON.stringify(lines)).not.toContain('Ada Lovelace')
  })

  it('puts a job whose handler throws back for later, with the error, and warns', async () => {
    const { jobs, registry, worker, lines } = setup()
    registry.register(greet, async () => {
      throw new Error('the provider said no')
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.runNext()

    expect(jobs.all).toMatchObject([
      { state: 'pending', attempts: 1, runAt: after(30_000), lastError: 'the provider said no', lockedUntil: null }
    ])
    expect(lines).toMatchObject([
      {
        level: 40,
        jobId: 'job-1',
        kind: 'test.greet',
        attempt: 1,
        retryAt: after(30_000).toISOString(),
        err: { message: 'the provider said no' },
        msg: 'job attempt failed'
      }
    ])
  })

  it('runs a job that failed once again at its retry time, and it can then succeed', async () => {
    const { clock, jobs, registry, worker } = setup()
    const attempts: number[] = []
    registry.register(greet, async (_payload, { attempt }) => {
      attempts.push(attempt)
      if (attempt === 1) throw new Error('not yet')
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.drain()
    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 1 }])

    clock.advance(30_000)
    await worker.drain()

    expect(attempts).toEqual([1, 2])
    expect(jobs.all).toMatchObject([{ state: 'done', attempts: 2, lastError: 'not yet' }])
  })

  it('leaves a job that fails every attempt as failed, and says so as an error', async () => {
    const { clock, jobs, registry, worker, lines } = setup()
    registry.register(greet, async () => {
      throw new Error('never')
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    for (let attempt = 1; attempt <= jobLimits.maxAttempts; attempt++) {
      await worker.drain()
      clock.advance(6 * 60 * 60 * 1000)
    }
    await worker.drain()

    expect(jobs.all).toMatchObject([{ state: 'failed', attempts: jobLimits.maxAttempts, lastError: 'never' }])
    expect(lines.map((line) => line.msg)).toEqual([
      ...Array(jobLimits.maxAttempts - 1).fill('job attempt failed'),
      'job failed'
    ])
    expect(lines.at(-1)).toMatchObject({
      level: 50,
      jobId: 'job-1',
      kind: 'test.greet',
      attempt: jobLimits.maxAttempts,
      err: { message: 'never' }
    })
  })

  it('gives up after the number of attempts its kind names', async () => {
    const { jobs, registry, worker } = setup()
    const once = { ...greet, kind: 'test.once', maxAttempts: 1 }
    registry.register(once, async () => {
      throw new Error('no')
    })
    await jobs.enqueue(once, { name: 'Ada' })

    await worker.runNext()

    expect(jobs.all).toMatchObject([{ state: 'failed', attempts: 1 }])
  })

  it('fails the attempt of a job whose kind has no handler, as an older release would meet', async () => {
    const { jobs, worker } = setup()
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.runNext()

    expect(jobs.all).toMatchObject([{ state: 'pending', lastError: 'no handler for job kind test.greet' }])
  })

  it('fails the attempt of a job whose payload no longer passes the schema, without calling the handler', async () => {
    const { jobs, registry, worker } = setup()
    const handler = vi.fn(async () => {})
    await jobs.enqueue(greet, { name: 'Ada' })
    const [job] = jobs.all
    Object.assign(job as object, { payload: { name: 7 } })
    registry.register(greet, handler)

    await worker.runNext()

    expect(handler).not.toHaveBeenCalled()
    expect(jobs.all).toMatchObject([{ state: 'pending', lastError: 'invalid payload for job kind test.greet' }])
  })

  it('keeps the message of something thrown that is not an error, cut to a thousand characters', async () => {
    const { jobs, registry, worker } = setup()
    registry.register(greet, async () => {
      throw 'x'.repeat(1_500)
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.runNext()

    expect(jobs.all[0]?.lastError).toBe('x'.repeat(1_000))
  })

  it('ends the turn of a handler that takes too long, tells it through the signal, and retries', async () => {
    const { jobs, registry, worker, timer } = setup()
    let context!: JobContext
    registry.register(greet, (_payload, given) => {
      context = given
      return new Promise<void>(() => {})
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    const running = worker.runNext()
    await timer.parked(jobLimits.handlerTimeoutMs)
    expect(context.signal.aborted).toBe(false)
    timer.advance(jobLimits.handlerTimeoutMs)
    await running

    expect(context.signal.aborted).toBe(true)
    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 1, lastError: 'job timed out after 60000 ms' }])
  })

  it('holds a job for the lease while its handler runs, and stops the clock of a handler that ended', async () => {
    const { jobs, registry, worker, timer } = setup()
    let lockedUntil: Date | null | undefined
    registry.register(greet, async () => {
      lockedUntil = jobs.all[0]?.lockedUntil
    })
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.runNext()

    expect(lockedUntil).toEqual(after(jobLimits.leaseMs))
    expect(timer.pending).toEqual([])
  })

  it('drains every job due now, and leaves the ones for later', async () => {
    const { jobs, registry, worker } = setup()
    registry.register(greet, async () => {})
    await jobs.enqueue(greet, { name: 'a' })
    await jobs.enqueue(greet, { name: 'b' })
    await jobs.enqueue(greet, { name: 'later' }, { runAt: after(1_000) })

    await worker.drain()

    expect(jobs.all.map((job) => job.state)).toEqual(['done', 'done', 'pending'])
  })
})

describe('JobWorker started (ADR 0056)', () => {
  it('runs what is due as it starts, then sleeps for the idle time when nothing is left', async () => {
    const { jobs, registry, worker, timer } = setup()
    registry.register(greet, async () => {})
    await jobs.enqueue(greet, { name: 'Ada' })

    worker.start()
    await timer.parked(IDLE)

    expect(jobs.all).toMatchObject([{ state: 'done' }])
    await worker.stop()
  })

  it('sleeps only until the next job is due, and runs it then', async () => {
    const { jobs, registry, worker, timer } = setup()
    registry.register(greet, async () => {})
    await jobs.enqueue(greet, { name: 'Ada' }, { runAt: after(90_000) })

    worker.start()
    await timer.parked(90_000)
    expect(jobs.all).toMatchObject([{ state: 'pending' }])

    timer.advance(90_000)
    await timer.parked(IDLE)

    expect(jobs.all).toMatchObject([{ state: 'done' }])
    await worker.stop()
  })

  it('looks at once when nudged, then again after 1, 2, 4, 8, 16 and 32 s, for a job not committed yet', async () => {
    const { jobs, registry, worker, timer } = setup()
    registry.register(greet, async () => {})
    worker.start()
    await timer.parked(IDLE)

    worker.nudge()
    for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000]) {
      await timer.parked(delay)
      timer.advance(delay)
    }
    await timer.parked(32_000)
    await jobs.enqueue(greet, { name: 'committed late' })
    timer.advance(32_000)
    await timer.parked(IDLE)

    expect(jobs.all).toMatchObject([{ state: 'done' }])
    expect(timer.asked.filter((ms) => ms !== jobLimits.handlerTimeoutMs)).toEqual([
      IDLE,
      1_000,
      2_000,
      4_000,
      8_000,
      16_000,
      32_000,
      IDLE
    ])
    await worker.stop()
  })

  it('keeps looking soon after a nudge that arrives while a handler runs', async () => {
    const { jobs, registry, worker, timer } = setup()
    registry.register(greet, async ({ name }) => {
      if (name === 'first') {
        await jobs.enqueue(greet, { name: 'second' }, { runAt: after(500) })
        worker.nudge()
      }
    })
    await jobs.enqueue(greet, { name: 'first' })

    worker.start()
    await timer.parked(500)
    timer.advance(500)
    await timer.parked(2_000)

    expect(jobs.all.map((job) => job.state)).toEqual(['done', 'done'])
    await worker.stop()
  })

  it('warns and looks again in 30 s when the store cannot be reached, without stopping', async () => {
    const { jobs, registry, worker, timer, lines } = setup()
    registry.register(greet, async () => {})
    const claim = vi.spyOn(jobs, 'claim').mockRejectedValueOnce(new Error('timeout exceeded when trying to connect'))
    await jobs.enqueue(greet, { name: 'Ada' })

    worker.start()
    await timer.parked(jobLimits.pollRetryMs)
    expect(lines).toMatchObject([
      { level: 40, err: { message: 'timeout exceeded when trying to connect' }, msg: 'job poll failed' }
    ])

    timer.advance(jobLimits.pollRetryMs)
    await timer.parked(IDLE)

    expect(claim).toHaveBeenCalledTimes(3)
    expect(jobs.all).toMatchObject([{ state: 'done' }])
    await worker.stop()
  })

  it('starts only once', async () => {
    const { jobs, registry, worker, timer } = setup()
    const claim = vi.spyOn(jobs, 'claim')
    registry.register(greet, async () => {})

    worker.start()
    worker.start()
    await timer.parked(IDLE)

    expect(claim).toHaveBeenCalledTimes(1)
    await worker.stop()
  })
})

describe('JobWorker stopping (ADR 0056)', () => {
  it('wakes a sleeping worker and ends without taking another job', async () => {
    const { jobs, registry, worker, timer } = setup()
    registry.register(greet, async () => {})
    worker.start()
    await timer.parked(IDLE)
    await jobs.enqueue(greet, { name: 'Ada' })

    await worker.stop()

    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 0 }])
    expect(timer.pending).toEqual([])
  })

  it('waits for the job in hand to finish', async () => {
    const { jobs, registry, worker } = setup()
    let entered!: () => void
    let release!: () => void
    const handlerEntered = new Promise<void>((resolve) => (entered = resolve))
    const gate = new Promise<void>((resolve) => (release = resolve))
    registry.register(greet, async () => {
      entered()
      await gate
    })
    await jobs.enqueue(greet, { name: 'Ada' })
    await jobs.enqueue(greet, { name: 'next' })
    worker.start()
    await handlerEntered

    const stopped = worker.stop()
    release()
    await stopped

    expect(jobs.all.map((job) => job.state)).toEqual(['done', 'pending'])
  })

  it('gives up waiting after 10 s, warns, and leaves the job to its lease', async () => {
    const { jobs, registry, worker, timer, lines } = setup()
    registry.register(greet, () => new Promise<void>(() => {}))
    await jobs.enqueue(greet, { name: 'Ada' })
    worker.start()
    await timer.parked(jobLimits.handlerTimeoutMs)

    const stopped = worker.stop()
    await timer.parked(jobLimits.stopTimeoutMs)
    timer.advance(jobLimits.stopTimeoutMs)
    await stopped

    expect(lines).toMatchObject([{ level: 40, timeoutMs: 10_000, msg: 'job still running at shutdown' }])
    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 1, lockedUntil: after(jobLimits.leaseMs) }])
  })

  it('answers every call with the same ending, started or not', async () => {
    const { worker } = setup()

    const first = worker.stop()

    expect(worker.stop()).toBe(first)
    await first
  })

  it('does not start once stopped', async () => {
    const { jobs, registry, worker } = setup()
    registry.register(greet, async () => {})
    await jobs.enqueue(greet, { name: 'Ada' })
    await worker.stop()

    worker.start()
    await worker.stop()

    expect(jobs.all).toMatchObject([{ state: 'pending', attempts: 0 }])
  })
})
