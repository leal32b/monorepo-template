import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { CountingIds, greet, start } from './testing/jobs.contract'
import { WakingJobQueue } from './waking-job-queue'

describe('WakingJobQueue', () => {
  const setup = () => {
    const jobs = new InMemoryJobs(new CountingIds(), new FixedClock(start))
    const wake = vi.fn()
    return { jobs, wake, queue: new WakingJobQueue(jobs, wake) }
  }

  it('enqueues on the queue it wraps, then wakes the worker', async () => {
    const { jobs, wake, queue } = setup()
    const runAt = new Date(start.getTime() + 60_000)

    const id = await queue.enqueue(greet, { name: 'Ada' }, { runAt })

    expect(id).toBe('job-1')
    expect(jobs.all).toMatchObject([{ id: 'job-1', payload: { name: 'Ada' }, runAt }])
    expect(wake).toHaveBeenCalledOnce()
  })

  it('does not wake anyone for a job that was refused', async () => {
    const { wake, queue } = setup()

    await expect(queue.enqueue(greet, { name: '' })).rejects.toThrow('test.greet')

    expect(wake).not.toHaveBeenCalled()
  })
})
