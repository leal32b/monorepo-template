import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import { InMemorySubscriptionRepository } from './in-memory-subscription-repository'

/** The token the kit's fake takes commands with. */
export const kitToken = 'billing-kit-token-0123'

/**
 * What a billing use-case or job test runs on (ADR 0063): the fake provider and the in-memory rows and
 * trail in one unit of work, on a fixed clock, 19 November 2026 at noon, and a counter for ids. `command`
 * sends the fake a command as the end-to-end suite would.
 */
export function billingKit(now = new Date('2026-11-19T12:00:00.000Z')) {
  const clock = new FixedClock(now)
  let sequence = 0
  const ids = { generate: () => `id-${++sequence}` }
  const provider = new FakeBillingProvider({ clock, ids, token: kitToken })
  const subscriptions = new InMemorySubscriptionRepository()
  const audit = new InMemoryAuditTrail()
  const unitOfWork = new InMemoryUnitOfWork({ subscriptions, audit })
  const command = (command: string, organizationId = 'org-1', eventId?: string) =>
    provider.readWebhook(Buffer.from(JSON.stringify({ command, organizationId, eventId })), {
      'fake-billing-token': kitToken
    })
  const entries = (organizationId = 'org-1') => audit.list(organizationId, { limit: 50 })
  return { clock, ids, provider, subscriptions, audit, unitOfWork, command, entries }
}
