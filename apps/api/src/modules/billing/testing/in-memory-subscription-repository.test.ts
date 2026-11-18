import { InMemorySubscriptionRepository } from './in-memory-subscription-repository'
import { aSubscription, describeSubscriptionRepository } from './subscription-repository.contract'

describeSubscriptionRepository('InMemorySubscriptionRepository', async () => new InMemorySubscriptionRepository())

describe('InMemorySubscriptionRepository', () => {
  it('puts its rows back as they were when a unit of work rolls back', async () => {
    const repo = new InMemorySubscriptionRepository()
    await repo.save(aSubscription('org-1'))
    const restore = repo.snapshot()

    await repo.save(aSubscription('org-2'))
    restore()

    expect(await repo.find('org-2')).toBeNull()
    expect(await repo.find('org-1')).not.toBeNull()
  })
})
