import { describeJobs, greet, start } from '#libs/jobs/testing/jobs.contract'
import { FixedClock } from './fixed-clock'
import { InMemoryJobs } from './in-memory-jobs'
import { InMemoryUnitOfWork } from './in-memory-unit-of-work'
import { UuidGenerator } from './uuid-generator'

describeJobs('InMemoryJobs', async (ids, clock) => new InMemoryJobs(ids, clock))

describe('InMemoryJobs in a unit of work (ADR 0052)', () => {
  const setup = () => {
    const jobs = new InMemoryJobs(new UuidGenerator(), new FixedClock(start))
    return { jobs, unitOfWork: new InMemoryUnitOfWork({ jobs }) }
  }

  it('keeps a job enqueued by work that ends', async () => {
    const { jobs, unitOfWork } = setup()

    await unitOfWork.run((stores) => stores.jobs.enqueue(greet, { name: 'Ada' }))

    expect(jobs.all).toMatchObject([{ kind: 'test.greet', payload: { name: 'Ada' }, state: 'pending' }])
  })

  it('drops a job enqueued by work that throws', async () => {
    const { jobs, unitOfWork } = setup()

    const work = unitOfWork.run(async (stores) => {
      await stores.jobs.enqueue(greet, { name: 'Ada' })
      throw new Error('changed my mind')
    })

    await expect(work).rejects.toThrow('changed my mind')
    expect(jobs.all).toEqual([])
  })
})
