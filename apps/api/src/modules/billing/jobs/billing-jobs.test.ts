import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { BillingNotice } from '#libs/ports/billing-provider.port'
import { billingKit } from '../testing/billing-kit'
import { subscribed } from '../testing/subscribed'
import { registerBillingJobs, syncPayloadOf, syncSubscription } from './billing-jobs'

describe('billing.sync-subscription (ADR 0063)', () => {
  it("runs a notice's job through the queue: the row follows the provider", async () => {
    const kit = billingKit()
    const { logger } = memoryLogger()
    const jobs = new InMemoryJobs(new CountingIds(), kit.clock)
    const registry = new JobRegistry()
    registerBillingJobs(registry, { ...kit, directory: kit.subscriptions, logger })
    const worker = new JobWorker({
      store: jobs,
      registry,
      clock: kit.clock,
      timer: new ManualTimer(kit.clock),
      logger,
      idlePollMs: 1
    })
    await subscribed(kit)
    const notice = (await kit.command('payment.fail')) as BillingNotice

    await jobs.enqueue(syncSubscription, syncPayloadOf('fake', notice))
    await worker.drain()

    expect(await kit.subscriptions.find('org-1')).toMatchObject({ status: 'past_due' })
  })

  it("keeps only the notice's ids in the payload", () => {
    expect(syncPayloadOf('fake', { eventId: 'evt_1', subscriptionId: 'sub_1' })).toEqual({
      provider: 'fake',
      eventId: 'evt_1',
      subscriptionId: 'sub_1',
      checkoutId: undefined,
      customerId: undefined
    })
  })
})
