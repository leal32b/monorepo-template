import { plans } from '@repo/contracts'
import { SubscriptionChangedException } from '../billing.errors'
import type { BillingDirectory } from '../billing-directory.port'
import { onTrial, type Subscription } from '../subscription'
import type { SubscriptionRepository } from '../subscription-repository.port'

/** The organizations a repository under test must know (a database adapter creates them first). */
export const contractOrganizations = ['org-1', 'org-2'] as const

const day = new Date('2026-11-07T10:00:00.000Z')

/** A row paid for, with every column set, an upgrade's checkout open included. */
export function aSubscription(organizationId = 'org-1', overrides: Partial<Subscription> = {}): Subscription {
  return {
    ...onTrial(organizationId, new Date('2026-10-20T10:00:00.000Z'), day),
    status: 'active',
    plan: 'basic',
    nextPlan: null,
    periodStartsAt: new Date('2026-11-01T10:00:00.000Z'),
    paidThrough: new Date('2026-12-01T10:00:00.000Z'),
    provider: 'fake',
    customerId: `cus_${organizationId}`,
    providerSubscriptionId: `sub_${organizationId}`,
    ...overrides
  }
}

const withEverything = aSubscription('org-1', {
  status: 'past_due',
  nextPlan: 'basic',
  plan: 'pro',
  pastDueSince: new Date('2026-12-01T10:00:00.000Z'),
  cancelAtPeriodEnd: true,
  checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: plans.pro.price.currency } },
  checkoutPage: { id: 'chk_1', url: 'https://pay.example/chk_1', expiresAt: new Date('2026-11-07T10:30:00.000Z') }
})

/**
 * What every `SubscriptionRepository` must do, against the in-memory fake and the database adapter
 * alike, so the fake that use-case tests lean on cannot drift from the real thing. A repository that
 * is also the `BillingDirectory` passes its part too.
 */
export function describeSubscriptionRepository(
  label: string,
  make: () => Promise<SubscriptionRepository & BillingDirectory>
): void {
  describe(`${label} as a SubscriptionRepository`, () => {
    let repo: SubscriptionRepository & BillingDirectory

    beforeEach(async () => {
      repo = await make()
    })

    it('finds no row for an organization on trial', async () => {
      expect(await repo.find('org-1')).toBeNull()
    })

    it('inserts the first row at version 1, and keeps it whole', async () => {
      const saved = await repo.save({ ...withEverything, version: 0 })

      expect(saved).toEqual({ ...withEverything, version: 1 })
      expect(await repo.find('org-1')).toEqual(saved)
    })

    it('keeps a row with no plan, period, provider or checkout', async () => {
      const trial = onTrial('org-1', new Date('2026-11-21T10:00:00.000Z'), day)

      expect(await repo.save(trial)).toEqual({ ...trial, version: 1 })
    })

    it('replaces the row at the version it was read at, and returns it at the next', async () => {
      const first = await repo.save(aSubscription('org-1'))
      const changed = { ...first, status: 'cancelled' as const, updatedAt: new Date('2026-11-08T10:00:00.000Z') }

      const saved = await repo.save(changed)

      expect(saved).toEqual({ ...changed, version: 2 })
      expect(await repo.find('org-1')).toEqual(saved)
    })

    it('refuses a save after another one, and a second first row', async () => {
      const first = await repo.save(aSubscription('org-1'))
      await repo.save(first)

      await expect(repo.save(first)).rejects.toThrow(SubscriptionChangedException)
      await expect(repo.save(aSubscription('org-1'))).rejects.toThrow(SubscriptionChangedException)
    })

    it('keeps each organization to its own row', async () => {
      await repo.save(aSubscription('org-1'))

      expect(await repo.find('org-2')).toBeNull()
      expect((await repo.save(aSubscription('org-2'))).organizationId).toBe('org-2')
    })

    describe('as the BillingDirectory', () => {
      beforeEach(async () => {
        await repo.save(withEverything)
        await repo.save(aSubscription('org-2', { checkoutPage: null }))
      })

      it("finds the organization by the provider's subscription, open checkout or customer", async () => {
        expect(await repo.organizationsFor('fake', { subscriptionId: 'sub_org-1' })).toEqual(['org-1'])
        expect(await repo.organizationsFor('fake', { checkoutId: 'chk_1' })).toEqual(['org-1'])
        expect(await repo.organizationsFor('fake', { customerId: 'cus_org-2' })).toEqual(['org-2'])
        expect(await repo.organizationsFor('fake', { subscriptionId: 'sub_new', customerId: 'cus_org-1' })).toEqual([
          'org-1'
        ])
      })

      it('finds none for ids no row holds, ids of another provider, or no ids', async () => {
        expect(await repo.organizationsFor('fake', { subscriptionId: 'sub_unknown' })).toEqual([])
        expect(await repo.organizationsFor('asaas', { subscriptionId: 'sub_org-1' })).toEqual([])
        expect(await repo.organizationsFor('fake', {})).toEqual([])
      })

      it('names both organizations when the ids point at two rows', async () => {
        const found = await repo.organizationsFor('fake', { subscriptionId: 'sub_org-1', customerId: 'cus_org-2' })

        expect(found.toSorted()).toEqual(['org-1', 'org-2'])
      })
    })
  })
}
