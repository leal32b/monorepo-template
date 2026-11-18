import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { cancelAtProvider } from '../../jobs/billing-jobs'
import { onTrial } from '../../subscription'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { CANCEL_DELAY_MS, EnqueueCancellationService } from './enqueue-cancellation.service'

function setUp() {
  const kit = billingKit()
  const jobs = new InMemoryJobs(new CountingIds(), kit.clock)
  const listener = new EnqueueCancellationService(kit.unitOfWork, jobs, kit.clock, cancelAtProvider)
  const pending = async () => {
    const found = []
    for (let n = 1; n <= 10; n++) {
      const job = await jobs.find(`job-${n}`)
      if (job !== undefined) found.push(job)
    }
    return found
  }
  return { ...kit, jobs, listener, pending }
}

describe('EnqueueCancellationService (ADR 0063)', () => {
  it('enqueues the end of a live subscription at the provider, a minute after the deletion asked', async () => {
    const kit = setUp()
    const row = await subscribed(kit)

    await kit.listener.beforeDelete(['org-1'])

    expect(await kit.pending()).toEqual([
      expect.objectContaining({
        kind: 'billing.cancel-at-provider',
        payload: { provider: 'fake', organizationId: 'org-1', subscriptionId: row.providerSubscriptionId },
        runAt: new Date(kit.clock.now().getTime() + CANCEL_DELAY_MS)
      })
    ])
  })

  it('enqueues nothing for an organization on trial, with no subscription there, or one that ended', async () => {
    const kit = setUp()
    await kit.subscriptions.save(onTrial('org-2', kit.clock.now(), kit.clock.now()))
    await subscribed(kit, { status: 'cancelled' }, 'org-3')

    await kit.listener.beforeDelete(['org-1', 'org-2', 'org-3'])

    expect(await kit.pending()).toEqual([])
  })
})
