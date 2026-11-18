import {
  accessOf,
  billingCheckoutInputSchema,
  billingPageSchema,
  billingPlanInputSchema,
  billingProblems,
  billingSchema,
  billingVersionInputSchema,
  capabilities,
  entitlement,
  entitlementKeySchema,
  entitlementsOf,
  entitlementsSchema,
  gracePeriod,
  isTaxId,
  limits,
  payerSchema,
  paymentMethods,
  planKeySchema,
  plans,
  prorateUpgrade,
  type SubscriptionState,
  subscriptionProblems,
  subscriptionSchema,
  trial,
  trialFrom,
  webhookReceiptSchema
} from './billing'

const day = 24 * 60 * 60 * 1000
const at = (iso: string) => new Date(iso)
const plus = (date: Date, days: number) => new Date(date.getTime() + days * day)

/** A period of 30 days, paid for. */
const november = { periodStartsAt: at('2026-11-01T12:00:00Z'), paidThrough: at('2026-12-01T12:00:00Z') }

/** A subscription paid for, active, with nothing scheduled. */
const active: SubscriptionState = {
  status: 'active',
  plan: 'basic',
  nextPlan: null,
  trialEndsAt: at('2026-10-15T12:00:00Z'),
  ...november,
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}

describe('the catalogue (ADR 0063)', () => {
  it('names capabilities for what they enable, and limits as <resource>.max', () => {
    for (const capability of capabilities) expect(capability).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
    for (const limit of limits) expect(limit).toMatch(/^[a-z]+(?:-[a-z]+)*\.max$/)
  })

  it('gives every plan a monthly price in one currency, and each limit of the catalogue', () => {
    const currencies = new Set(Object.values(plans).map((plan) => plan.price.currency))

    expect(currencies.size).toBe(1)
    for (const plan of Object.values(plans)) {
      expect(plan.interval).toBe('month')
      expect(Number.isSafeInteger(plan.price.amount)).toBe(true)
      expect(Object.keys(plan.entitlements.limits).sort()).toEqual([...limits].sort())
    }
  })

  it('runs a trial of 14 days with the dearest plan, and a grace period of 14 days', () => {
    expect(trial.days).toBe(14)
    expect(trial.entitlements).toBe(plans.pro.entitlements)
    expect(gracePeriod.days).toBe(14)
  })

  it('reads a plan by its key and nothing else', () => {
    expect(planKeySchema.parse('basic')).toBe('basic')
    expect(planKeySchema.safeParse('enterprise').success).toBe(false)
  })
})

describe('trialFrom', () => {
  it('puts an organization without a subscription on trial, ending 14 days after it was created', () => {
    const created = at('2026-11-01T09:30:00Z')

    expect(trialFrom(created)).toEqual({
      status: 'trialing',
      plan: null,
      nextPlan: null,
      trialEndsAt: at('2026-11-15T09:30:00Z'),
      periodStartsAt: null,
      paidThrough: null,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
      checkout: null
    })
  })
})

describe('accessOf', () => {
  it('gives a trial full access until it ends, then read only', () => {
    const trialing = trialFrom(at('2026-11-01T00:00:00Z'))

    expect(accessOf(trialing, at('2026-11-14T23:59:59Z'))).toBe('full')
    expect(accessOf(trialing, at('2026-11-15T00:00:00Z'))).toBe('read-only')
  })

  it('gives an active subscription full access, past its paid period too, while no cancellation is scheduled', () => {
    expect(accessOf(active, at('2026-11-20T00:00:00Z'))).toBe('full')
    expect(accessOf(active, at('2026-12-05T00:00:00Z'))).toBe('full')
  })

  it('makes an active subscription read only when the period of a scheduled cancellation ends', () => {
    const cancelling = { ...active, cancelAtPeriodEnd: true }

    expect(accessOf(cancelling, at('2026-12-01T11:59:59Z'))).toBe('full')
    expect(accessOf(cancelling, at('2026-12-01T12:00:00Z'))).toBe('read-only')
  })

  it('keeps full access for a scheduled cancellation whose paid period is not known', () => {
    expect(accessOf({ ...active, cancelAtPeriodEnd: true, paidThrough: null }, at('2027-01-01T00:00:00Z'))).toBe('full')
  })

  it('gives a late payment the grace period, counted from its due date, then read only', () => {
    const due = at('2026-11-03T12:00:00Z')
    const pastDue = { ...active, status: 'past_due' as const, pastDueSince: due }

    expect(accessOf(pastDue, plus(due, gracePeriod.days - 0.001))).toBe('full')
    expect(accessOf(pastDue, plus(due, gracePeriod.days))).toBe('read-only')
  })

  it('keeps full access for a late payment whose due date is not known', () => {
    expect(accessOf({ ...active, status: 'past_due' }, at('2027-01-01T00:00:00Z'))).toBe('full')
  })

  it('makes a cancelled subscription read only, whatever its dates say', () => {
    expect(accessOf({ ...active, status: 'cancelled' }, at('2026-11-02T00:00:00Z'))).toBe('read-only')
  })
})

describe('entitlementsOf', () => {
  it('grants the plan paid for, and the trial while there is none', () => {
    expect(entitlementsOf(active)).toBe(plans.basic.entitlements)
    expect(entitlementsOf({ ...active, plan: 'pro' })).toBe(plans.pro.entitlements)
    expect(entitlementsOf(trialFrom(at('2026-11-01T00:00:00Z')))).toBe(trial.entitlements)
  })
})

describe('entitlement', () => {
  const basic = { entitlements: plans.basic.entitlements }
  const pro = { entitlements: plans.pro.entitlements }

  it('says whether a capability is held', () => {
    expect(entitlement(pro, 'activity-log')).toBe(true)
    expect(entitlement(basic, 'activity-log')).toBe(false)
  })

  it("gives a limit's number, or null for no limit", () => {
    expect(entitlement(basic, 'customers.max')).toBe(100)
    expect(entitlement(pro, 'customers.max')).toBeNull()
  })
})

describe('prorateUpgrade', () => {
  const upgrade = (now: Date, period = november) => prorateUpgrade({ from: 'basic', to: 'pro', now, ...period })

  it('charges the difference for the days left of the period, in the currency of the plans', () => {
    // R$ 50.00 of difference, 12 of 30 days left.
    expect(upgrade(at('2026-11-19T12:00:00Z'))).toEqual({ amount: 2000, currency: 'BRL' })
  })

  it('rounds down to the centavo below, never above', () => {
    // 50 000 / 31 = 1 612.9 for 10 of 31 days left.
    const period = { periodStartsAt: at('2026-12-01T00:00:00Z'), paidThrough: at('2027-01-01T00:00:00Z') }

    expect(upgrade(at('2026-12-22T00:00:00Z'), period)).toEqual({ amount: 1612, currency: 'BRL' })
  })

  it('counts a part of a day left as a whole day', () => {
    // 11 days and 2 hours left count as 12.
    expect(upgrade(at('2026-11-20T10:00:00Z')).amount).toBe(2000)
  })

  it('rounds the length of the period to the nearest day', () => {
    const longer = (hours: number) => ({
      periodStartsAt: november.periodStartsAt,
      paidThrough: new Date(november.paidThrough.getTime() + hours * 60 * 60 * 1000)
    })
    // 30 days and 5 hours is 30 days; 30 days and 13 hours is 31. The whole period is left.
    expect(upgrade(at('2026-11-01T12:00:00Z'), longer(5)).amount).toBe(5000)
    expect(upgrade(at('2026-11-01T12:00:00Z'), longer(13)).amount).toBe(5000)
    expect(upgrade(at('2026-11-02T12:00:00Z'), longer(13)).amount).toBe(Math.floor((5000 * 30) / 31))
  })

  it('charges at most the whole difference, when the clock reads before the period started', () => {
    expect(upgrade(at('2026-10-20T00:00:00Z')).amount).toBe(5000)
  })

  it('charges nothing once the period is over, and nothing for a plan that is not dearer', () => {
    expect(upgrade(at('2026-12-01T12:00:00Z')).amount).toBe(0)
    expect(upgrade(at('2026-12-09T00:00:00Z')).amount).toBe(0)
    const now = at('2026-11-19T12:00:00Z')
    expect(prorateUpgrade({ from: 'pro', to: 'basic', now, ...november })).toEqual({ amount: 0, currency: 'BRL' })
    expect(prorateUpgrade({ from: 'pro', to: 'pro', now, ...november }).amount).toBe(0)
  })

  it('charges nothing for a period shorter than half a day', () => {
    const period = { periodStartsAt: at('2026-11-01T00:00:00Z'), paidThrough: at('2026-11-01T11:00:00Z') }

    expect(upgrade(at('2026-11-01T01:00:00Z'), period).amount).toBe(0)
  })
})

describe('entitlementsSchema', () => {
  it("accepts every plan's entitlements", () => {
    for (const plan of Object.values(plans))
      expect(entitlementsSchema.parse(plan.entitlements)).toEqual(plan.entitlements)
  })

  it.each([
    ['an unknown capability', { capabilities: ['group-sessions'], limits: { 'customers.max': 1 } }],
    ['a missing limit', { capabilities: [], limits: {} }],
    ['a negative limit', { capabilities: [], limits: { 'customers.max': -1 } }],
    ['a fraction', { capabilities: [], limits: { 'customers.max': 1.5 } }]
  ])('refuses %s', (_, entitlements) => {
    expect(entitlementsSchema.safeParse(entitlements).success).toBe(false)
  })
})

describe('entitlementKeySchema', () => {
  it('accepts every capability and limit, and nothing else', () => {
    for (const key of [...capabilities, ...limits]) expect(entitlementKeySchema.parse(key)).toBe(key)
    expect(entitlementKeySchema.safeParse('pro').success).toBe(false)
  })
})

describe('subscriptionSchema', () => {
  const answer = {
    status: 'active',
    access: 'full',
    plan: 'basic',
    nextPlan: null,
    trialEndsAt: '2026-10-15T12:00:00.000Z',
    periodStartsAt: '2026-11-01T12:00:00.000Z',
    paidThrough: '2026-12-01T12:00:00.000Z',
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
  }

  it('accepts a subscription as the membership read answers it', () => {
    expect(subscriptionSchema.parse(answer)).toEqual(answer)
    expect(subscriptionSchema.parse({ ...answer, checkout: null }).checkout).toBeNull()
  })

  it.each([
    ['an unknown status', { status: 'paused' }],
    ['an unknown access', { access: 'none' }],
    ['an unknown plan', { plan: 'enterprise' }],
    ['a date with no zone', { paidThrough: '2026-12-01T12:00:00' }],
    ['an unknown kind of checkout', { checkout: { ...answer.checkout, kind: 'refund' } }]
  ])('refuses %s', (_, change) => {
    expect(subscriptionSchema.safeParse({ ...answer, ...change }).success).toBe(false)
  })
})

describe('subscriptionProblems', () => {
  it('names the codes of the refusals a subscription answers with', () => {
    expect(subscriptionProblems).toEqual({
      limitReached: 'plan_limit_reached',
      planRequired: 'plan_required',
      readOnly: 'subscription_read_only'
    })
  })
})

describe('the billing routes (ADR 0063)', () => {
  it('names how the owner pays: the provider opens a different page for each (ADR 0064)', () => {
    expect(paymentMethods).toEqual(['card', 'pix', 'boleto'])
  })

  it('takes a plan, a method, the version read and a path of the web to come back to', () => {
    const input = { plan: 'pro', method: 'pix', version: 0, returnTo: '/acme/settings/billing' }

    expect(billingCheckoutInputSchema.parse(input)).toEqual(input)
    expect(billingPlanInputSchema.parse({ plan: 'basic', version: 3 })).toEqual({ plan: 'basic', version: 3 })
    expect(billingVersionInputSchema.parse({ version: 3 })).toEqual({ version: 3 })
  })

  it.each([
    ['an unknown plan', { plan: 'enterprise' }],
    ['an unknown method', { method: 'cash' }],
    ['a version below zero', { version: -1 }],
    ['a whole URL, which could send the owner to another site', { returnTo: 'https://evil.example/' }],
    ['a path to another host', { returnTo: '//evil.example/' }],
    ['a path with a query of its own', { returnTo: '/acme/settings/billing?checkout=x' }],
    ['a path with a backslash', { returnTo: '/\\evil.example' }]
  ])('refuses a checkout with %s', (_, change) => {
    const input = { plan: 'pro', method: 'card', version: 1, returnTo: '/acme/settings/billing' }

    expect(billingCheckoutInputSchema.safeParse({ ...input, ...change }).success).toBe(false)
  })

  it("takes the payer's name and CPF or CNPJ, which Asaas needs to create its customer (ADR 0069)", () => {
    const payer = { name: 'Barbearia do Zé', taxId: '11222333000181', email: 'ze@example.com' }
    const input = { plan: 'pro', method: 'boleto', version: 0, returnTo: '/acme/settings/billing', payer }

    expect(billingCheckoutInputSchema.parse(input)).toEqual(input)
    expect(payerSchema.parse({ name: '  Ana Paula  ', taxId: '52998224725', email: ' Ana@Example.com ' })).toEqual({
      name: 'Ana Paula',
      taxId: '52998224725',
      email: 'ana@example.com'
    })
  })

  it.each([
    ['a CPF', '52998224725'],
    ['another CPF', '24971563792'],
    ['a CPF whose check digits are 0', '98765432100'],
    ['a CNPJ', '11222333000181'],
    ['an alphanumeric CNPJ, issued since July 2026', '12ABC34501DE35']
  ])('accepts %s with its check digits', (_, taxId) => {
    expect(isTaxId(taxId)).toBe(true)
  })

  it.each([
    ['a CPF whose first check digit is wrong', '52998224715'],
    ['a CPF whose second check digit is wrong', '52998224724'],
    ['a CNPJ whose first check digit is wrong', '11222333000191'],
    ['a CNPJ whose second check digit is wrong', '11222333000182'],
    ['a CPF of one repeated digit', '11111111111'],
    ['a CNPJ of one repeated digit', '00000000000000'],
    ['a CPF with its punctuation', '529.982.247-25'],
    ['a CNPJ in lowercase', '12abc34501de35'],
    ['a CPF with a letter', '5299822472A'],
    ['a document of another length', '1234567890'],
    ['nothing', '']
  ])('refuses %s', (_, taxId) => {
    expect(isTaxId(taxId)).toBe(false)
    expect(payerSchema.safeParse({ name: 'Ana', taxId, email: 'ana@example.com' }).success).toBe(false)
  })

  it.each([
    ['no name', { name: '' }],
    ['a name of spaces', { name: '   ' }],
    ['a name longer than 100 characters', { name: 'a'.repeat(101) }],
    ['no email', { email: '' }],
    ['an email without a domain', { email: 'ana@' }]
  ])('refuses a payer with %s', (_, change) => {
    const payer = { name: 'Ana', taxId: '52998224725', email: 'ana@example.com' }

    expect(payerSchema.safeParse({ ...payer, ...change }).success).toBe(false)
  })

  it('answers with the page to send the owner to, or none when nothing is to be paid', () => {
    expect(billingPageSchema.parse({ url: 'https://pay.example/c/1' })).toEqual({ url: 'https://pay.example/c/1' })
    expect(billingPageSchema.parse({ url: null })).toEqual({ url: null })
    expect(billingPageSchema.safeParse({ url: 'not a url' }).success).toBe(false)
  })

  it("reads the plan page: the state, the version, the provider's reference and minimum, the open page", () => {
    const answer = {
      subscription: {
        status: 'active',
        access: 'full',
        plan: 'basic',
        nextPlan: null,
        trialEndsAt: '2026-10-15T12:00:00.000Z',
        periodStartsAt: '2026-11-01T12:00:00.000Z',
        paidThrough: '2026-12-01T12:00:00.000Z',
        pastDueSince: null,
        cancelAtPeriodEnd: false,
        checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
      },
      version: 4,
      reference: 'sub_1',
      checkoutUrl: 'https://pay.example/c/1',
      checkoutExpiresAt: '2026-11-19T12:30:00.000Z',
      minimumCharge: { amount: 500, currency: 'BRL' }
    }

    expect(billingSchema.parse(answer)).toEqual(answer)
    expect(
      billingSchema.parse({ ...answer, reference: null, checkoutUrl: null, checkoutExpiresAt: null })
    ).toMatchObject({ reference: null, checkoutUrl: null, checkoutExpiresAt: null })
  })

  it('names the codes of the refusals the billing routes answer with', () => {
    expect(billingProblems).toEqual({
      changed: 'subscription_changed',
      checkoutOpen: 'checkout_open',
      checkoutPaid: 'checkout_paid',
      notActive: 'subscription_not_active',
      cancellationScheduled: 'cancellation_scheduled',
      paymentOverdue: 'payment_overdue',
      wrongDirection: 'plan_change_not_allowed'
    })
  })

  it("answers a provider's notice with the same receipt, new, repeated or ignored", () => {
    expect(webhookReceiptSchema.parse({ received: true })).toEqual({ received: true })
    expect(webhookReceiptSchema.safeParse({ received: false }).success).toBe(false)
  })
})
