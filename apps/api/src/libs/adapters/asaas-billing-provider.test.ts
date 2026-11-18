import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { BillingProviderUnavailableException, PayerRequiredException } from '#libs/ports/billing-provider.port'
import { WebhookRefused } from '#libs/ports/webhook-reader.port'
import { AsaasBillingProvider } from './asaas-billing-provider'
import { FixedClock } from './fixed-clock'

/** A call the adapter made, as the test server received it. */
type Call = { method: string; path: string; query: URLSearchParams; headers: IncomingHttpHeaders; body: unknown }
type Answer = { status?: number; body?: unknown; raw?: string; delayMs?: number }

const unexpected: Answer = { status: 500, body: { errors: [{ code: 'unexpected_call', description: 'No route' }] } }

/**
 * A local server that answers like Asaas's API (`/v3`), with the bodies of its documentation's
 * examples: each test says what a route answers; a call to any other route is a 500 the test sees.
 */
class AsaasTestServer {
  readonly calls: Call[] = []
  readonly #routes = new Map<string, Answer | ((call: Call) => Answer)>()
  readonly #server: Server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const url = new URL(req.url as string, 'http://asaas.test')
      const raw = Buffer.concat(chunks).toString('utf8')
      const path = url.pathname.replace(/^\/v3/, '')
      const call = {
        method: req.method as string,
        path,
        query: url.searchParams,
        headers: req.headers,
        body: raw === '' ? undefined : JSON.parse(raw)
      }
      this.calls.push(call)
      const route = this.#routes.get(`${call.method} ${path}`) ?? unexpected
      const answer = typeof route === 'function' ? route(call) : route
      setTimeout(() => {
        res.writeHead(answer.status ?? 200, { 'Content-Type': 'application/json' })
        res.end(answer.raw ?? JSON.stringify(answer.body))
      }, answer.delayMs ?? 0)
    })
  })

  get url(): string {
    return `http://127.0.0.1:${(this.#server.address() as AddressInfo).port}/v3`
  }

  /** What `route` (`METHOD /path`) answers until the next test. */
  on(route: string, answer: Answer | ((call: Call) => Answer)): this {
    this.#routes.set(route, answer)
    return this
  }

  /** The calls to `route`, in order. */
  to(route: string): Call[] {
    return this.calls.filter((call) => `${call.method} ${call.path}` === route)
  }

  reset(): void {
    this.calls.length = 0
    this.#routes.clear()
  }

  start(): Promise<void> {
    return new Promise((resolve) => this.#server.listen(0, '127.0.0.1', resolve))
  }

  stop(): Promise<void> {
    this.#server.closeAllConnections()
    return new Promise((resolve) => this.#server.close(() => resolve()))
  }
}

const apiKey = `$aact_hmlg_${'k'.repeat(40)}`
const webhookToken = 'w'.repeat(48)
const organizationId = 'org-1'
const back = { returnUrl: 'https://app.example/acme/settings/billing?checkout=returned', cancelUrl: 'https://x/c' }
const payer = { name: 'Barbearia do Zé Ltda', taxId: '24971563792', email: 'ze@example.com' }
/** Noon in Brasília, 4 November 2026. */
const now = new Date('2026-11-04T15:00:00.000Z')
const minute = 60 * 1000

const list = (data: unknown[], hasMore = false) => ({
  object: 'list',
  hasMore,
  totalCount: data.length,
  limit: 100,
  offset: 0,
  data
})

/** The customer of the documentation's example, ours by its reference. */
const customer = (overrides: Record<string, unknown> = {}) => ({
  object: 'customer',
  id: 'cus_000005219613',
  name: 'Marcelo Almeida',
  cpfCnpj: '24971563792',
  externalReference: organizationId,
  deleted: false,
  ...overrides
})

const SUB = 'sub_m5gdy1upm25fbwgx'

/** The subscription of the documentation's `SUBSCRIPTION_CREATED` example. */
const subscription = (overrides: Record<string, unknown> = {}) => ({
  object: 'subscription',
  id: SUB,
  dateCreated: '2026-10-04',
  customer: 'cus_000005219613',
  paymentLink: null,
  value: 49,
  nextDueDate: '2026-12-04',
  endDate: null,
  cycle: 'MONTHLY',
  description: 'Monthly plan basic',
  billingType: 'CREDIT_CARD',
  deleted: false,
  status: 'ACTIVE',
  externalReference: organizationId,
  ...overrides
})

/** A charge, after the documentation's `PAYMENT_RECEIVED` example. */
const charge = (id: string, dueDate: string, status: string, overrides: Record<string, unknown> = {}) => ({
  object: 'payment',
  id,
  dateCreated: dueDate,
  customer: 'cus_000005219613',
  subscription: SUB,
  checkoutSession: null,
  dueDate,
  value: 49,
  netValue: 46.54,
  billingType: 'CREDIT_CARD',
  status,
  invoiceUrl: `https://www.asaas.com/i/${id}`,
  bankSlipUrl: null,
  deleted: false,
  ...overrides
})

/** The checkout of the reference's `CheckoutSessionResponseDTO` example. */
const CHECKOUT = '131ca662-56c8-4479-b5b3-fd61a413fce7'
const checkoutAnswer = {
  body: { id: CHECKOUT, link: `https://sandbox.asaas.com/checkoutSession/show/${CHECKOUT}`, status: 'ACTIVE' }
}
const thirtyMinutesOn = now.getTime() + 30 * minute

const server = new AsaasTestServer()
let clock: FixedClock
let provider: AsaasBillingProvider

beforeAll(() => server.start())
afterAll(() => server.stop())

beforeEach(() => {
  server.reset()
  clock = new FixedClock(now)
  provider = new AsaasBillingProvider({ apiKey, apiUrl: server.url, webhookToken, clock, timeoutMs: 300 })
})

/** Asaas holding a subscription with these charges. */
function holds(state: Record<string, unknown>, charges: unknown[]) {
  server.on(`GET /subscriptions/${SUB}`, { body: subscription(state) })
  server.on(`GET /subscriptions/${SUB}/payments`, { body: list(charges) })
}

describe('AsaasBillingProvider (ADR 0064)', () => {
  it('is named asaas, with the R$ 5.00 minimum charge of Asaas', () => {
    expect(provider.name).toBe('asaas')
    expect(provider.minimumCharge).toEqual({ amount: 500, currency: 'BRL' })
  })

  it('sends the key in access_token and a User-Agent, which Asaas requires', async () => {
    server.on(`GET /subscriptions/${SUB}`, { status: 404 })

    await provider.subscription(SUB)

    const [call] = server.calls
    expect(call?.headers.access_token).toBe(apiKey)
    expect(call?.headers['user-agent']).toBe('monorepo-template-api')
    expect(call?.headers.accept).toBe('application/json')
  })

  describe('startCheckout', () => {
    it('by card: creates the customer from the payer, then a recurring Checkout of the plan for 30 minutes', async () => {
      server
        .on('GET /customers', { body: list([]) })
        .on('POST /customers', { body: customer() })
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /checkouts', checkoutAnswer)

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'basic',
        method: 'card',
        customerId: null,
        payer,
        ...back
      })

      expect(checkout).toEqual({
        checkoutId: `checkout:${CHECKOUT}:${thirtyMinutesOn}`,
        url: `https://sandbox.asaas.com/checkoutSession/show/${CHECKOUT}`,
        expiresAt: new Date(thirtyMinutesOn),
        customerId: 'cus_000005219613'
      })
      expect(server.to('GET /customers')[0]?.query.get('externalReference')).toBe(organizationId)
      expect(server.to('POST /customers')[0]?.body).toEqual({
        name: payer.name,
        cpfCnpj: payer.taxId,
        email: payer.email,
        externalReference: organizationId
      })
      expect(server.to('POST /checkouts')[0]?.headers['content-type']).toBe('application/json')
      expect(server.to('POST /checkouts')[0]?.body).toEqual({
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: 30,
        externalReference: organizationId,
        customer: 'cus_000005219613',
        callback: { successUrl: back.returnUrl, cancelUrl: back.cancelUrl, expiredUrl: back.cancelUrl },
        items: [{ name: 'Plan basic', description: 'Monthly plan basic', value: 49, quantity: 1 }],
        subscription: { cycle: 'MONTHLY', nextDueDate: '2026-11-04' }
      })
    })

    it('reuses the customer the row holds, naming whom the owner typed, and builds the page when Asaas gives no link', async () => {
      server
        .on('PUT /customers/cus_held', { body: customer({ id: 'cus_held' }) })
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /checkouts', { body: { id: CHECKOUT } })

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'pro',
        method: 'card',
        customerId: 'cus_held',
        payer,
        ...back
      })

      expect(checkout.customerId).toBe('cus_held')
      expect(checkout.url).toBe(`${new URL(server.url).origin}/checkoutSession/show?id=${CHECKOUT}`)
      expect(server.to('PUT /customers/cus_held')[0]?.body).toEqual({
        name: payer.name,
        cpfCnpj: payer.taxId,
        email: payer.email
      })
      expect(server.to('GET /customers')).toHaveLength(0)
    })

    it('finds the customer of the organization by its reference, before creating one: Asaas has no idempotency key', async () => {
      server
        .on('GET /customers', { body: list([customer({ id: 'cus_gone', deleted: true }), customer()]) })
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /checkouts', checkoutAnswer)

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      expect(checkout.customerId).toBe('cus_000005219613')
      expect(server.to('POST /customers')).toHaveLength(0)
    })

    it('refuses to create a customer without the payer, whose name and CPF or CNPJ Asaas requires', async () => {
      server.on('GET /customers', { body: list([]) })

      await expect(
        provider.startCheckout({ organizationId, plan: 'basic', method: 'pix', customerId: null, ...back })
      ).rejects.toBeInstanceOf(PayerRequiredException)
      expect(server.to('POST /customers')).toHaveLength(0)
    })

    it('by Pix: creates a monthly subscription due today, and sends the owner to its first charge', async () => {
      server
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /subscriptions', { body: subscription({ billingType: 'PIX', nextDueDate: '2026-11-04' }) })
        .on(`GET /subscriptions/${SUB}/payments`, {
          body: list([charge('pay_2', '2026-12-04', 'PENDING'), charge('pay_1', '2026-11-04', 'PENDING')])
        })

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'basic',
        method: 'pix',
        customerId: 'cus_000005219613',
        ...back
      })

      expect(checkout).toEqual({
        checkoutId: `subscription:${SUB}`,
        url: 'https://www.asaas.com/i/pay_1',
        // The charge is overdue, and the checkout lapses, when its due date ends in Brasília.
        expiresAt: new Date('2026-11-05T03:00:00.000Z'),
        customerId: 'cus_000005219613'
      })
      expect(server.to('POST /subscriptions')[0]?.body).toEqual({
        customer: 'cus_000005219613',
        billingType: 'PIX',
        value: 49,
        nextDueDate: '2026-11-04',
        cycle: 'MONTHLY',
        description: 'Monthly plan basic',
        externalReference: organizationId,
        callback: { successUrl: back.returnUrl, autoRedirect: true }
      })
      expect(server.to('GET /subscriptions')[0]?.query.toString()).toBe(
        'customer=cus_000005219613&externalReference=org-1&status=ACTIVE&offset=0&limit=100'
      )
    })

    it('by boleto: the first charge falls due in three days, so the payer has time to pay it', async () => {
      server
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /subscriptions', { body: subscription({ billingType: 'BOLETO', value: 99 }) })
        .on(`GET /subscriptions/${SUB}/payments`, { body: list([charge('pay_1', '2026-11-07', 'PENDING')]) })

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'pro',
        method: 'boleto',
        customerId: 'cus_000005219613',
        ...back
      })

      expect(server.to('POST /subscriptions')[0]?.body).toMatchObject({
        billingType: 'BOLETO',
        value: 99,
        nextDueDate: '2026-11-07'
      })
      expect(checkout.expiresAt).toEqual(new Date('2026-11-08T03:00:00.000Z'))
    })

    it('uses again an unpaid subscription of ours that a lost answer left, and deletes the others never paid', async () => {
      const matching = subscription({ id: 'sub_match', billingType: 'PIX' })
      server
        .on('GET /subscriptions', {
          body: list([
            subscription({ id: 'sub_paid', billingType: 'PIX' }),
            subscription({ id: 'sub_late', billingType: 'PIX' }),
            subscription({ id: 'sub_other', billingType: 'BOLETO' }),
            matching,
            subscription({ id: 'sub_twin', billingType: 'PIX' })
          ])
        })
        .on('GET /subscriptions/sub_paid/payments', { body: list([charge('pay_p', '2026-10-04', 'RECEIVED')]) })
        .on('GET /subscriptions/sub_late/payments', { body: list([charge('pay_l', '2026-11-01', 'OVERDUE')]) })
        .on('GET /subscriptions/sub_other/payments', { body: list([charge('pay_o', '2026-11-04', 'PENDING')]) })
        .on('GET /subscriptions/sub_match/payments', { body: list([charge('pay_m', '2026-11-04', 'PENDING')]) })
        .on('GET /subscriptions/sub_twin/payments', { body: list([charge('pay_t', '2026-11-04', 'PENDING')]) })
        .on('DELETE /subscriptions/sub_late', { body: { deleted: true, id: 'sub_late' } })
        .on('DELETE /subscriptions/sub_other', { body: { deleted: true, id: 'sub_other' } })
        .on('DELETE /subscriptions/sub_twin', { body: { deleted: true, id: 'sub_twin' } })

      const checkout = await provider.startCheckout({
        organizationId,
        plan: 'basic',
        method: 'pix',
        customerId: 'cus_000005219613',
        ...back
      })

      expect(checkout).toMatchObject({ checkoutId: 'subscription:sub_match', url: 'https://www.asaas.com/i/pay_m' })
      expect(server.to('POST /subscriptions')).toHaveLength(0)
      expect(server.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)).toEqual([
        '/subscriptions/sub_late',
        '/subscriptions/sub_other',
        '/subscriptions/sub_twin'
      ])
    })

    it('by card, deletes every unpaid subscription of ours: the Checkout creates its own', async () => {
      server
        .on('GET /subscriptions', { body: list([subscription({ id: 'sub_left', billingType: 'PIX' })]) })
        .on('GET /subscriptions/sub_left/payments', { body: list([charge('pay_x', '2026-11-04', 'PENDING')]) })
        .on('DELETE /subscriptions/sub_left', { body: { deleted: true, id: 'sub_left' } })
        .on('POST /checkouts', checkoutAnswer)

      await provider.startCheckout({
        organizationId,
        plan: 'basic',
        method: 'card',
        customerId: 'cus_000005219613',
        ...back
      })

      expect(server.to('DELETE /subscriptions/sub_left')).toHaveLength(1)
    })

    it('is out of reach when the subscription has no charge to pay yet', async () => {
      server
        .on('GET /subscriptions', { body: list([]) })
        .on('POST /subscriptions', { body: subscription({ billingType: 'PIX' }) })
        .on(`GET /subscriptions/${SUB}/payments`, { body: list([]) })

      await expect(
        provider.startCheckout({
          organizationId,
          plan: 'basic',
          method: 'pix',
          customerId: 'cus_000005219613',
          ...back
        })
      ).rejects.toThrow(`subscription ${SUB} has no charge to pay yet`)
    })
  })

  describe('startPayment', () => {
    const upgrade = {
      organizationId,
      customerId: 'cus_000005219613',
      amount: { amount: 3350, currency: 'BRL' } as const,
      description: 'Upgrade from basic to pro until 2026-12-04',
      ...back
    }

    it.each([
      ['card', 'CREDIT_CARD'],
      ['pix', 'PIX']
    ] as const)('by %s: opens a one-off Checkout of the difference for the customer', async (method, billingType) => {
      server.on('POST /checkouts', checkoutAnswer)

      const checkout = await provider.startPayment({ ...upgrade, method })

      expect(checkout).toEqual({
        checkoutId: `checkout:${CHECKOUT}:${thirtyMinutesOn}`,
        url: checkoutAnswer.body.link,
        expiresAt: new Date(thirtyMinutesOn)
      })
      expect(server.to('POST /checkouts')[0]?.body).toEqual({
        billingTypes: [billingType],
        chargeTypes: ['DETACHED'],
        minutesToExpire: 30,
        externalReference: organizationId,
        customer: 'cus_000005219613',
        callback: { successUrl: back.returnUrl, cancelUrl: back.cancelUrl, expiredUrl: back.cancelUrl },
        items: [{ name: 'Plan upgrade', description: upgrade.description, value: 33.5, quantity: 1 }]
      })
    })

    it('by boleto: a charge due in three days, whose boleto cannot be paid once it lapses', async () => {
      server.on('POST /payments', {
        body: charge('pay_up', '2026-11-07', 'PENDING', { subscription: null, billingType: 'BOLETO' })
      })

      const checkout = await provider.startPayment({ ...upgrade, method: 'boleto' })

      expect(checkout).toEqual({
        checkoutId: 'payment:pay_up',
        url: 'https://www.asaas.com/i/pay_up',
        expiresAt: new Date('2026-11-08T03:00:00.000Z')
      })
      expect(server.to('POST /payments')[0]?.body).toEqual({
        customer: 'cus_000005219613',
        billingType: 'BOLETO',
        value: 33.5,
        dueDate: '2026-11-07',
        description: upgrade.description,
        externalReference: organizationId,
        daysAfterDueDateToRegistrationCancellation: 0,
        callback: { successUrl: back.returnUrl, autoRedirect: true }
      })
    })
  })

  describe('payment', () => {
    it.each(['chk_1', 'checkout:x', 'checkout:x:soon', 'checkout::1', 'subscription:', 'payment:a:1', 'other:x'])(
      'answers expired for %j, an id it never gave, without calling Asaas',
      async (checkoutId) => {
        expect(await provider.payment(checkoutId)).toBe('expired')
        expect(server.calls).toHaveLength(0)
      }
    )

    describe('of an Asaas Checkout', () => {
      const checkoutId = `checkout:${CHECKOUT}:${thirtyMinutesOn}`

      it('is paid once a charge it created is confirmed', async () => {
        server.on('GET /payments', {
          body: list([charge('pay_c', '2026-11-04', 'CONFIRMED', { checkoutSession: CHECKOUT })])
        })

        expect(await provider.payment(checkoutId)).toBe('paid')
        expect(server.to('GET /payments')[0]?.query.get('checkoutSession')).toBe(CHECKOUT)
      })

      it('is open until its page lapses, then expired', async () => {
        server.on('GET /payments', { body: list([]) })

        expect(await provider.payment(checkoutId)).toBe('open')
        clock.advance(30 * minute)
        expect(await provider.payment(checkoutId)).toBe('expired')
      })
    })

    describe('of a subscription by the API', () => {
      const checkoutId = `subscription:${SUB}`

      it.each([
        ['open while its first charge waits', [charge('pay_1', '2026-11-04', 'PENDING')], 'open'],
        ['paid once a charge is received', [charge('pay_1', '2026-11-04', 'RECEIVED')], 'paid'],
        ['paid once a charge is confirmed', [charge('pay_1', '2026-11-04', 'CONFIRMED')], 'paid'],
        ['expired once its first charge is overdue', [charge('pay_1', '2026-11-04', 'OVERDUE')], 'expired'],
        ['expired with no charge', [], 'expired']
      ])('is %s', async (_case, charges, expected) => {
        holds({ billingType: 'PIX' }, charges)

        expect(await provider.payment(checkoutId)).toBe(expected)
      })

      it.each([
        ['unknown', { status: 404 }],
        ['deleted', { body: subscription({ deleted: true }) }],
        ['inactive', { body: subscription({ status: 'INACTIVE' }) }]
      ])('is expired once the subscription is %s', async (_case, answer) => {
        server.on(`GET /subscriptions/${SUB}`, answer)

        expect(await provider.payment(checkoutId)).toBe('expired')
      })
    })

    describe("of an upgrade's boleto", () => {
      it.each([
        ['open while it waits', { body: charge('pay_up', '2026-11-07', 'PENDING') }, 'open'],
        ['paid once received', { body: charge('pay_up', '2026-11-07', 'RECEIVED') }, 'paid'],
        ['expired once overdue', { body: charge('pay_up', '2026-11-07', 'OVERDUE') }, 'expired'],
        ['expired once deleted', { body: charge('pay_up', '2026-11-07', 'PENDING', { deleted: true }) }, 'expired'],
        ['expired when unknown', { status: 404 }, 'expired']
      ])('is %s', async (_case, answer, expected) => {
        server.on('GET /payments/pay_up', answer)

        expect(await provider.payment('payment:pay_up')).toBe(expected)
      })
    })
  })

  describe('cancelCheckout', () => {
    it('cancels an Asaas Checkout', async () => {
      server.on(`POST /checkouts/${CHECKOUT}/cancel`, { body: { id: CHECKOUT, status: 'CANCELED' } })

      await provider.cancelCheckout(`checkout:${CHECKOUT}:${thirtyMinutesOn}`)

      expect(server.to(`POST /checkouts/${CHECKOUT}/cancel`)).toHaveLength(1)
    })

    it('does nothing to a Checkout Asaas will not cancel: paid, expired or cancelled already', async () => {
      server.on(`POST /checkouts/${CHECKOUT}/cancel`, {
        status: 400,
        body: { errors: [{ code: 'invalid_action', description: 'Checkout já pago' }] }
      })

      await expect(provider.cancelCheckout(`checkout:${CHECKOUT}:${thirtyMinutesOn}`)).resolves.toBeUndefined()
    })

    it('is out of reach when Asaas fails cancelling a Checkout', async () => {
      server.on(`POST /checkouts/${CHECKOUT}/cancel`, { status: 502, raw: 'Bad gateway' })

      await expect(provider.cancelCheckout(`checkout:${CHECKOUT}:${thirtyMinutesOn}`)).rejects.toBeInstanceOf(
        BillingProviderUnavailableException
      )
    })

    it('deletes an unpaid subscription, which takes its charges with it', async () => {
      holds({ billingType: 'BOLETO' }, [charge('pay_1', '2026-11-07', 'PENDING')])
      server.on(`DELETE /subscriptions/${SUB}`, { body: { deleted: true, id: SUB } })

      await provider.cancelCheckout(`subscription:${SUB}`)

      expect(server.to(`DELETE /subscriptions/${SUB}`)).toHaveLength(1)
    })

    it('leaves a subscription whose first charge is paid', async () => {
      holds({ billingType: 'PIX' }, [charge('pay_1', '2026-11-04', 'RECEIVED')])

      await provider.cancelCheckout(`subscription:${SUB}`)

      expect(server.to(`DELETE /subscriptions/${SUB}`)).toHaveLength(0)
    })

    it("deletes an upgrade's unpaid charge, and takes one already gone as done", async () => {
      server
        .on('GET /payments/pay_up', { body: charge('pay_up', '2026-11-07', 'PENDING') })
        .on('DELETE /payments/pay_up', { status: 404 })

      await provider.cancelCheckout('payment:pay_up')

      expect(server.to('DELETE /payments/pay_up')).toHaveLength(1)
    })

    it('does nothing for an id it never gave', async () => {
      await provider.cancelCheckout('chk_1')

      expect(server.calls).toHaveLength(0)
    })
  })

  describe('paymentPage', () => {
    it("is the invoice of the oldest overdue charge, Asaas's hosted page", async () => {
      server.on(`GET /subscriptions/${SUB}/payments`, {
        body: list([
          charge('pay_2', '2026-11-04', 'OVERDUE'),
          charge('pay_0', '2026-09-04', 'OVERDUE', { deleted: true }),
          charge('pay_1', '2026-10-04', 'OVERDUE')
        ])
      })

      expect(await provider.paymentPage(SUB)).toBe('https://www.asaas.com/i/pay_1')
      expect(server.calls[0]?.query.get('status')).toBe('OVERDUE')
    })

    it('is null when nothing is overdue', async () => {
      server.on(`GET /subscriptions/${SUB}/payments`, { body: list([]) })

      expect(await provider.paymentPage(SUB)).toBeNull()
    })
  })

  it("changePlan sets the plan's value, on the charges already created too", async () => {
    server.on(`PUT /subscriptions/${SUB}`, { body: subscription({ value: 99 }) })

    await provider.changePlan(SUB, 'pro')

    expect(server.to(`PUT /subscriptions/${SUB}`)[0]?.body).toEqual({ value: 99, updatePendingPayments: true })
  })

  describe('cancel', () => {
    it('now: deletes the subscription, and takes one already gone as done', async () => {
      server.on(`DELETE /subscriptions/${SUB}`, { status: 404 })

      await provider.cancel(SUB, { atPeriodEnd: false })

      expect(server.to(`DELETE /subscriptions/${SUB}`)).toHaveLength(1)
    })

    it('at the period end: removes the next charge already created, and ends the subscription the day before it', async () => {
      holds({}, [
        charge('pay_1', '2026-10-04', 'RECEIVED'),
        charge('pay_2', '2026-11-04', 'CONFIRMED'),
        charge('pay_3', '2026-12-04', 'PENDING')
      ])
      server
        .on('DELETE /payments/pay_3', { body: { deleted: true, id: 'pay_3' } })
        .on(`PUT /subscriptions/${SUB}`, { body: subscription({ endDate: '2026-12-03' }) })

      await provider.cancel(SUB, { atPeriodEnd: true })

      expect(server.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)).toEqual([
        '/payments/pay_3'
      ])
      expect(server.to(`PUT /subscriptions/${SUB}`)[0]?.body).toEqual({ endDate: '2026-12-03' })
    })

    it('at the period end of a subscription never paid: deletes it, since nothing was paid for', async () => {
      holds({}, [charge('pay_1', '2026-11-04', 'PENDING')])
      server.on(`DELETE /subscriptions/${SUB}`, { body: { deleted: true, id: SUB } })

      await provider.cancel(SUB, { atPeriodEnd: true })

      expect(server.to(`DELETE /subscriptions/${SUB}`)).toHaveLength(1)
    })

    it('at the period end of a subscription Asaas does not know: out of reach, nothing changed', async () => {
      server.on(`GET /subscriptions/${SUB}`, { status: 404 })

      await expect(provider.cancel(SUB, { atPeriodEnd: true })).rejects.toThrow(`it does not know ${SUB}`)
    })
  })

  describe('resume', () => {
    it('clears the end and has the charge of the next period created on the day the paid one ends', async () => {
      holds({ endDate: '2026-12-03' }, [charge('pay_2', '2026-11-04', 'CONFIRMED')])
      server.on(`PUT /subscriptions/${SUB}`, { body: subscription() })

      await provider.resume(SUB)

      expect(server.to(`PUT /subscriptions/${SUB}`)[0]?.body).toEqual({
        status: 'ACTIVE',
        endDate: null,
        nextDueDate: '2026-12-04'
      })
    })

    it('leaves the next due date alone for a subscription never paid', async () => {
      holds({ endDate: '2026-12-03' }, [])
      server.on(`PUT /subscriptions/${SUB}`, { body: subscription() })

      await provider.resume(SUB)

      expect(server.to(`PUT /subscriptions/${SUB}`)[0]?.body).toEqual({ status: 'ACTIVE', endDate: null })
    })
  })

  describe('subscription', () => {
    it('is null for a subscription Asaas does not know', async () => {
      server.on(`GET /subscriptions/${SUB}`, { status: 404 })

      expect(await provider.subscription(SUB)).toBeNull()
    })

    it('is active, paid through the due date of the charge after the last one paid', async () => {
      holds({ value: 99 }, [
        charge('pay_3', '2026-12-04', 'PENDING'),
        charge('pay_1', '2026-10-04', 'RECEIVED'),
        charge('pay_2', '2026-11-04', 'CONFIRMED')
      ])

      expect(await provider.subscription(SUB)).toEqual({
        subscriptionId: SUB,
        customerId: 'cus_000005219613',
        reference: organizationId,
        status: 'active',
        periodStart: new Date('2026-11-04T03:00:00.000Z'),
        paidThrough: new Date('2026-12-04T03:00:00.000Z'),
        overdueSince: null,
        cancelAtPeriodEnd: false,
        price: { amount: 9900, currency: 'BRL' }
      })
    })

    it("is paid through the subscription's next due date while that charge is not created", async () => {
      holds({ nextDueDate: '2026-12-04' }, [charge('pay_2', '2026-11-04', 'RECEIVED')])

      expect(await provider.subscription(SUB)).toMatchObject({
        status: 'active',
        paidThrough: new Date('2026-12-04T03:00:00.000Z')
      })
    })

    it('is paid through nothing when Asaas gives no next due date', async () => {
      holds({ nextDueDate: null }, [charge('pay_2', '2026-11-04', 'RECEIVED')])

      expect(await provider.subscription(SUB)).toMatchObject({ status: 'active', paidThrough: null })
    })

    it("names the organization by its customer's reference when a Checkout made the subscription", async () => {
      holds({ externalReference: null }, [])
      server.on('GET /customers/cus_000005219613', { body: customer() })

      expect(await provider.subscription(SUB)).toMatchObject({ reference: organizationId })
    })

    it('names no organization when neither the subscription nor its customer holds one', async () => {
      holds({ externalReference: null }, [])
      server.on('GET /customers/cus_000005219613', { status: 404 })

      expect(await provider.subscription(SUB)).toMatchObject({ reference: '' })
    })

    it('is pending, granting nothing, until its first charge is paid', async () => {
      holds({}, [charge('pay_1', '2026-11-04', 'OVERDUE')])

      expect(await provider.subscription(SUB)).toMatchObject({
        status: 'pending',
        periodStart: null,
        paidThrough: null
      })
    })

    it('is past due from the due date of its oldest overdue charge', async () => {
      holds({}, [
        charge('pay_1', '2026-09-04', 'RECEIVED'),
        charge('pay_3', '2026-11-04', 'OVERDUE'),
        charge('pay_2', '2026-10-04', 'OVERDUE')
      ])

      expect(await provider.subscription(SUB)).toMatchObject({
        status: 'past_due',
        overdueSince: new Date('2026-10-04T03:00:00.000Z'),
        paidThrough: new Date('2026-10-04T03:00:00.000Z')
      })
    })

    it.each([
      ['deleted', { deleted: true }],
      ['made inactive', { status: 'INACTIVE' }],
      ['expired', { status: 'EXPIRED' }]
    ])('is cancelled once %s', async (_case, state) => {
      holds(state, [charge('pay_1', '2026-11-04', 'RECEIVED')])

      expect(await provider.subscription(SUB)).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: false })
    })

    it('ends at the period end once an end is set: active and ending until the paid period ends, then cancelled', async () => {
      holds({ endDate: '2026-12-03', status: 'EXPIRED' }, [charge('pay_2', '2026-11-04', 'CONFIRMED')])

      expect(await provider.subscription(SUB)).toMatchObject({
        status: 'active',
        cancelAtPeriodEnd: true,
        paidThrough: new Date('2026-12-04T03:00:00.000Z')
      })

      clock.advance(new Date('2026-12-04T03:00:00.000Z').getTime() - now.getTime())

      expect(await provider.subscription(SUB)).toMatchObject({ status: 'cancelled', cancelAtPeriodEnd: false })
    })

    it('reads every page of the charges, 100 at a time', async () => {
      server.on(`GET /subscriptions/${SUB}`, { body: subscription() })
      server.on(`GET /subscriptions/${SUB}/payments`, (call) =>
        call.query.get('offset') === '0'
          ? { body: list([charge('pay_1', '2026-10-04', 'RECEIVED')], true) }
          : { body: list([charge('pay_2', '2026-11-04', 'RECEIVED')]) }
      )

      expect(await provider.subscription(SUB)).toMatchObject({ periodStart: new Date('2026-11-04T03:00:00.000Z') })
      expect(server.to(`GET /subscriptions/${SUB}/payments`).map((call) => call.query.get('offset'))).toEqual([
        '0',
        '100'
      ])
    })
  })

  describe('when Asaas fails', () => {
    it("names the call, its status and Asaas's error codes, never the key", async () => {
      server.on(`GET /subscriptions/${SUB}`, {
        status: 400,
        body: { errors: [{ code: 'invalid_access_token', description: `A chave ${apiKey} é inválida` }, {}] }
      })

      const reading = provider.subscription(SUB)

      await expect(reading).rejects.toBeInstanceOf(BillingProviderUnavailableException)
      await expect(reading).rejects.toThrow(
        `The payment provider could not answer: GET /subscriptions/${SUB} answered 400 invalid_access_token,unknown`
      )
      await expect(reading).rejects.not.toThrow(apiKey)
    })

    it('is out of reach on a 5xx without a body it can read', async () => {
      server.on(`PUT /subscriptions/${SUB}`, { status: 503, raw: '<html>Service unavailable</html>' })

      await expect(provider.changePlan(SUB, 'pro')).rejects.toThrow(`PUT /subscriptions/${SUB} answered 503 unknown`)
    })

    it('is out of reach when Asaas is too slow', async () => {
      server.on(`GET /subscriptions/${SUB}`, { body: subscription(), delayMs: 1_000 })

      await expect(provider.subscription(SUB)).rejects.toThrow(`GET /subscriptions/${SUB} did not answer`)
    })

    it('is out of reach on a body it does not expect', async () => {
      server.on('POST /checkouts', { body: { status: 'ACTIVE' } })

      await expect(
        provider.startPayment({
          organizationId,
          customerId: 'cus_1',
          amount: { amount: 1000, currency: 'BRL' },
          description: 'Upgrade',
          method: 'card',
          ...back
        })
      ).rejects.toThrow('POST /checkouts answered an unexpected body')
    })

    it('is out of reach when nothing answers at its address', async () => {
      const offline = new AsaasBillingProvider({ apiKey, apiUrl: 'http://127.0.0.1:9/v3', webhookToken, clock })

      await expect(offline.subscription(SUB)).rejects.toBeInstanceOf(BillingProviderUnavailableException)
    })
  })

  describe('readWebhook', () => {
    const read = (body: unknown, token: string | null = webhookToken) =>
      provider.readWebhook(
        Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
        token === null ? {} : { 'asaas-access-token': token }
      )
    const event = (name: string, object: Record<string, unknown>) => ({
      id: 'evt_05b708f961d739ea7eba7e4db318f621&368604920',
      event: name,
      dateCreated: '2026-11-04 12:00:00',
      account: { id: '47ed0d25-f9fb-4b35-b23a-d8895caf92b7', ownerId: null },
      ...object
    })

    it('refuses a notice without the token, before reading it', async () => {
      await expect(read('not json', null)).rejects.toEqual(new WebhookRefused('no token'))
    })

    it('refuses a notice whose token does not match, compared in constant time', async () => {
      await expect(read(event('PAYMENT_RECEIVED', {}), 'x'.repeat(48))).rejects.toEqual(
        new WebhookRefused('token does not match')
      )
      await expect(read(event('PAYMENT_RECEIVED', {}), 'short')).rejects.toBeInstanceOf(WebhookRefused)
    })

    it.each([
      'PAYMENT_CREATED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_OVERDUE',
      'PAYMENT_REFUNDED',
      'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
      'PAYMENT_DELETED'
    ])("takes the subscription and the customer of a subscription's charge from %s", async (name) => {
      expect(await read(event(name, { payment: charge('pay_080225913252', '2026-11-04', 'RECEIVED') }))).toEqual({
        eventId: 'evt_05b708f961d739ea7eba7e4db318f621&368604920',
        subscriptionId: SUB,
        customerId: 'cus_000005219613',
        checkoutId: undefined
      })
    })

    it('takes a one-off charge as the checkout it is', async () => {
      const notice = await read(
        event('PAYMENT_RECEIVED', { payment: charge('pay_up', '2026-11-07', 'RECEIVED', { subscription: null }) })
      )

      expect(notice).toEqual({
        eventId: expect.any(String),
        subscriptionId: undefined,
        customerId: 'cus_000005219613',
        checkoutId: 'payment:pay_up'
      })
    })

    it.each(['SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED'])(
      'takes the subscription and its customer from %s',
      async (name) => {
        expect(await read(event(name, { subscription: subscription() }))).toEqual({
          eventId: expect.any(String),
          subscriptionId: SUB,
          customerId: 'cus_000005219613'
        })
      }
    )

    it.each(['CHECKOUT_PAID', 'CHECKOUT_CANCELED', 'CHECKOUT_EXPIRED'])(
      "takes the checkout's customer from %s",
      async (name) => {
        const checkout = { id: CHECKOUT, link: null, status: 'PAID', customer: 'cus_000005219613' }

        expect(await read(event(name, { checkout }))).toEqual({
          eventId: expect.any(String),
          customerId: 'cus_000005219613'
        })
      }
    )

    it.each([
      [
        'an event the template does not use',
        event('PAYMENT_BANK_SLIP_VIEWED', { payment: charge('p', '2026-11-04', 'PENDING') })
      ],
      ['a payment event without its charge', event('PAYMENT_RECEIVED', {})],
      ['a subscription event without its subscription', event('SUBSCRIPTION_CREATED', {})],
      ['a checkout without a customer', event('CHECKOUT_PAID', { checkout: { id: CHECKOUT, customer: null } })],
      ['a body without an event', { id: 'evt_1' }],
      ['a body that is not JSON', '{not json']
    ])('ignores %s, answered 200 so the queue goes on', async (_case, body) => {
      expect(await read(body)).toBe('ignored')
    })
  })
})
