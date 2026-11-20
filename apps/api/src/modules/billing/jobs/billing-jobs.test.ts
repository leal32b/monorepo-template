import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { JobRegistry } from '#libs/jobs/job-registry'
import { JobWorker } from '#libs/jobs/job-worker'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { BillingNotice } from '#libs/ports/billing-provider.port'
import { billingKit } from '../testing/billing-kit'
import { subscribed } from '../testing/subscribed'
import { cancelAtProvider, registerBillingJobs, remindTrialEnd, syncPayloadOf, syncSubscription } from './billing-jobs'

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

describe('billing.cancel-at-provider (ADR 0063)', () => {
  it('waits for the deletion through its attempts, and gives up quietly on the last one', async () => {
    const kit = billingKit()
    const { logger, lines } = memoryLogger()
    const jobs = new InMemoryJobs(new CountingIds(), kit.clock)
    const registry = new JobRegistry()
    registerBillingJobs(registry, { ...kit, directory: kit.subscriptions, logger })
    const timer = new ManualTimer(kit.clock)
    const worker = new JobWorker({ store: jobs, registry, clock: kit.clock, timer, logger, idlePollMs: 1 })
    const row = await subscribed(kit)

    const id = await jobs.enqueue(cancelAtProvider, {
      provider: 'fake',
      organizationId: 'org-1',
      subscriptionId: row.providerSubscriptionId as string
    })
    for (let attempt = 1; attempt <= 5; attempt++) {
      await worker.drain()
      kit.clock.advance(7 * 60 * 60 * 1000)
    }

    expect(await jobs.find(id)).toMatchObject({ state: 'done', attempts: 5 })
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'billing cancellation skipped', reason: 'organization kept' })
    )
  })
})

describe('billing.remind-trial-end (ADR 0073)', () => {
  it('runs on its day and leaves the owner’s email on the queue', async () => {
    const kit = billingKit()
    const { logger } = memoryLogger()
    const registry = new JobRegistry()
    registerBillingJobs(registry, { ...kit, directory: kit.subscriptions, logger })
    const worker = new JobWorker({
      store: kit.jobs,
      registry,
      clock: kit.clock,
      timer: new ManualTimer(kit.clock),
      logger,
      idlePollMs: 1
    })

    await kit.jobs.enqueue(remindTrialEnd, { organizationId: 'org-1', trialEndsAt: '2026-11-22T12:00:00.000Z' })
    await worker.runNext()

    expect(kit.jobs.all).toMatchObject([
      { kind: 'billing.remind-trial-end', state: 'done' },
      { kind: 'billing.send-email', state: 'pending', payload: { email: 'trialEnding' } }
    ])
  })
})
