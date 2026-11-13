import { createHash, timingSafeEqual } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'
import { type Money, type PlanKey, plans } from '@repo/contracts'
import * as z from 'zod/mini'
import { HttpProblem } from '#libs/http/problem'
import {
  type BillingNotice,
  type BillingProvider,
  BillingProviderUnavailableException,
  type Checkout,
  type CheckoutPayment,
  type ProviderSubscription
} from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { Timer } from '#libs/ports/timer.port'
import { WebhookRefused } from '#libs/ports/webhook-reader.port'

/** How long a checkout's page takes a payment, as Asaas's checkout of 30 minutes (ADR 0064). */
const CHECKOUT_MINUTES = 30

/** The header a command carries, compared in constant time with `FAKE_BILLING_TOKEN`. */
export const FAKE_BILLING_TOKEN_HEADER = 'fake-billing-token'

/**
 * What the end-to-end suite and a developer can tell the fake (ADR 0063), sent as JSON to
 * `POST /api/webhooks/fake`. Each names the organization whose open checkout or live subscription it
 * acts on, and may name the event id of its notice, so a test can send the same notice again.
 */
const commandSchema = z.object({
  command: z.enum([
    'checkout.complete',
    'checkout.abandon',
    'payment.fail',
    'payment.recover',
    'period.renew',
    'subscription.cancel'
  ]),
  organizationId: z.string(),
  eventId: z.optional(z.string().check(z.minLength(1)))
})

type Command = z.output<typeof commandSchema>

type FakeCheckout = {
  id: string
  kind: 'subscription' | 'payment'
  reference: string
  customerId: string
  plan: PlanKey | null
  status: CheckoutPayment
  expiresAt: Date
}

type FakeSubscription = ProviderSubscription

export type FakeBillingOptions = {
  clock: Clock
  ids: IdGenerator
  /** `FAKE_BILLING_TOKEN`: what a command must carry. Unset, every command is refused. */
  token: string | undefined
  /** In `pnpm dev`: every checkout completes by itself after `afterMs`, as if its payer paid (ADR 0063). */
  autoComplete?: { afterMs: number; timer: Timer } | undefined
}

const sha256 = (value: string) => createHash('sha256').update(value).digest()

/** One month later, by the calendar in UTC: what a monthly plan pays for. */
function monthAfter(date: Date): Date {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

const nothingToActOn = (detail: string) => new HttpProblem(409, 'fake_billing_nothing_to_act_on', { detail })

/**
 * The billing provider of tests, of the end-to-end suite and of development (ADR 0063): checkouts and
 * subscriptions in memory, on the API's clock. A checkout's page is the return URL itself, so there is
 * no fake page to build. Tests drive it through its methods and `readWebhook`; the suite and a
 * developer send commands to its webhook route, and everything after the notice it returns is the
 * real path. Env validation refuses it when the web origin is https. It keeps its state in the API's
 * process: a worker in a process of its own (`dist/worker.js`) would hold another, empty one.
 */
export class FakeBillingProvider implements BillingProvider {
  readonly name = 'fake'
  /** Asaas's R$ 5.00 a charge (ADR 0064), so an upgrade below it is free here too. */
  readonly minimumCharge: Money = { amount: 500, currency: 'BRL' }

  readonly #clock: Clock
  readonly #ids: IdGenerator
  readonly #token: Buffer | undefined
  readonly #autoComplete: FakeBillingOptions['autoComplete']
  readonly #customers = new Map<string, string>()
  readonly #checkouts = new Map<string, FakeCheckout>()
  readonly #subscriptions = new Map<string, FakeSubscription>()
  readonly #notices = new Map<string, BillingNotice>()
  #listener: ((notice: BillingNotice) => Promise<void>) | undefined
  #failNext = false

  constructor({ clock, ids, token, autoComplete }: FakeBillingOptions) {
    this.#clock = clock
    this.#ids = ids
    this.#token = token === undefined ? undefined : sha256(token)
    this.#autoComplete = autoComplete
  }

  /** Where the notices of `autoComplete` go: the inbox a provider's webhook route also writes to. */
  listen(deliver: (notice: BillingNotice) => Promise<void>): void {
    this.#listener = deliver
  }

  /** In tests only: the next call to the provider fails as an outage would. */
  failNextCall(): void {
    this.#failNext = true
  }

  async startCheckout({
    organizationId,
    plan,
    customerId,
    returnUrl
  }: Parameters<BillingProvider['startCheckout']>[0]): Promise<Checkout & { customerId: string }> {
    this.#call()
    const customer = customerId ?? this.#customerOf(organizationId)
    const checkout = this.#open(
      { kind: 'subscription', reference: organizationId, customerId: customer, plan },
      returnUrl
    )
    return { ...checkout, customerId: customer }
  }

  async startPayment({
    organizationId,
    customerId,
    returnUrl
  }: Parameters<BillingProvider['startPayment']>[0]): Promise<Checkout> {
    this.#call()
    if (!this.#customers.has(customerId)) throw new Error(`unknown customer ${customerId}`)
    return this.#open({ kind: 'payment', reference: organizationId, customerId, plan: null }, returnUrl)
  }

  async payment(checkoutId: string): Promise<CheckoutPayment> {
    this.#call()
    return this.#statusOf(this.#checkouts.get(checkoutId))
  }

  async cancelCheckout(checkoutId: string): Promise<void> {
    this.#call()
    const checkout = this.#checkouts.get(checkoutId)
    if (checkout !== undefined && this.#statusOf(checkout) === 'open') checkout.status = 'expired'
  }

  async paymentPage(_subscriptionId: string): Promise<string | null> {
    this.#call()
    return null
  }

  async changePlan(subscriptionId: string, plan: PlanKey): Promise<void> {
    this.#call()
    this.#subscription(subscriptionId).price = plans[plan].price
  }

  async cancel(subscriptionId: string, { atPeriodEnd }: { atPeriodEnd: boolean }): Promise<void> {
    this.#call()
    const subscription = this.#subscription(subscriptionId)
    if (atPeriodEnd) subscription.cancelAtPeriodEnd = true
    else subscription.status = 'cancelled'
  }

  async resume(subscriptionId: string): Promise<void> {
    this.#call()
    this.#subscription(subscriptionId).cancelAtPeriodEnd = false
  }

  async subscription(subscriptionId: string): Promise<ProviderSubscription | null> {
    this.#call()
    const subscription = this.#subscriptions.get(subscriptionId)
    return subscription === undefined ? null : { ...subscription }
  }

  /**
   * Authenticates a command by its token, before it reads the body, then carries it out and returns the
   * notice a provider would have sent. An event id it has sent before gets the same notice back,
   * carried out once.
   */
  async readWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<BillingNotice> {
    if (this.#token === undefined) throw new WebhookRefused('no token configured')
    const given = headers[FAKE_BILLING_TOKEN_HEADER]
    if (typeof given !== 'string' || !timingSafeEqual(sha256(given), this.#token)) {
      throw new WebhookRefused('token does not match')
    }
    const command = this.#parse(rawBody)
    const sent = command.eventId === undefined ? undefined : this.#notices.get(command.eventId)
    if (sent !== undefined) return sent
    const notice = { eventId: command.eventId ?? `evt_${this.#ids.generate()}`, ...this.#carryOut(command) }
    this.#notices.set(notice.eventId, notice)
    return notice
  }

  #parse(rawBody: Buffer): Command {
    let body: unknown
    try {
      body = JSON.parse(rawBody.toString('utf8'))
    } catch {
      body = undefined
    }
    const command = commandSchema.safeParse(body)
    if (!command.success) {
      throw new HttpProblem(400, 'validation_failed', {
        detail: `Send one of ${commandSchema.shape.command.options.join(', ')}, with the organizationId it acts on.`
      })
    }
    return command.data
  }

  #carryOut({ command, organizationId }: Command): Omit<BillingNotice, 'eventId'> {
    if (command === 'checkout.complete' || command === 'checkout.abandon') {
      const checkout = this.#openCheckoutOf(organizationId)
      if (command === 'checkout.abandon') {
        checkout.status = 'expired'
        return { checkoutId: checkout.id, customerId: checkout.customerId }
      }
      return this.#complete(checkout)
    }
    const subscription = this.#liveSubscriptionOf(organizationId)
    const now = this.#clock.now()
    if (command === 'payment.fail') {
      subscription.status = 'past_due'
      subscription.overdueSince = now
    } else if (command === 'payment.recover') {
      Object.assign(subscription, {
        status: 'active',
        overdueSince: null,
        periodStart: now,
        paidThrough: monthAfter(now)
      })
    } else if (command === 'period.renew') {
      const periodStart = subscription.paidThrough as Date
      if (subscription.cancelAtPeriodEnd) subscription.status = 'cancelled'
      else Object.assign(subscription, { status: 'active', periodStart, paidThrough: monthAfter(periodStart) })
    } else {
      subscription.status = 'cancelled'
    }
    return { subscriptionId: subscription.subscriptionId, customerId: subscription.customerId }
  }

  /** Pays a checkout: a first subscription starts, paid for a month; an upgrade's payment is paid. */
  #complete(checkout: FakeCheckout): Omit<BillingNotice, 'eventId'> {
    checkout.status = 'paid'
    if (checkout.kind === 'payment') return { checkoutId: checkout.id, customerId: checkout.customerId }
    const now = this.#clock.now()
    const plan = checkout.plan as PlanKey
    const subscriptionId = `sub_${this.#ids.generate()}`
    this.#subscriptions.set(subscriptionId, {
      subscriptionId,
      customerId: checkout.customerId,
      reference: checkout.reference,
      status: 'active',
      periodStart: now,
      paidThrough: monthAfter(now),
      overdueSince: null,
      cancelAtPeriodEnd: false,
      price: plans[plan].price
    })
    return { checkoutId: checkout.id, subscriptionId, customerId: checkout.customerId }
  }

  /** A checkout whose page is `url`, the return URL itself: there is no fake page to pay on. */
  #open(checkout: Omit<FakeCheckout, 'id' | 'status' | 'expiresAt'>, url: string): Checkout {
    const opened: FakeCheckout = {
      ...checkout,
      id: `chk_${this.#ids.generate()}`,
      status: 'open',
      expiresAt: new Date(this.#clock.now().getTime() + CHECKOUT_MINUTES * 60 * 1000)
    }
    this.#checkouts.set(opened.id, opened)
    if (this.#autoComplete !== undefined) {
      const { afterMs, timer } = this.#autoComplete
      void timer.wait(afterMs).then(() => this.#completeByItself(opened))
    }
    return { checkoutId: opened.id, url, expiresAt: opened.expiresAt }
  }

  /**
   * `autoComplete`: pays a checkout still open and hands its notice on. A delivery that fails leaves the
   * checkout paid; its notice can be sent again with `checkout.complete` and the event id in the log.
   */
  async #completeByItself(checkout: FakeCheckout): Promise<void> {
    if (this.#statusOf(checkout) !== 'open') return
    const notice = { eventId: `evt_${this.#ids.generate()}`, ...this.#complete(checkout) }
    this.#notices.set(notice.eventId, notice)
    await this.#listener?.(notice).catch(() => undefined)
  }

  #statusOf(checkout: FakeCheckout | undefined): CheckoutPayment {
    if (checkout === undefined) return 'expired'
    if (checkout.status === 'open' && this.#clock.now() >= checkout.expiresAt) return 'expired'
    return checkout.status
  }

  #customerOf(organizationId: string): string {
    const known = [...this.#customers].find(([, reference]) => reference === organizationId)?.[0]
    if (known !== undefined) return known
    const customerId = `cus_${this.#ids.generate()}`
    this.#customers.set(customerId, organizationId)
    return customerId
  }

  #openCheckoutOf(organizationId: string): FakeCheckout {
    const open = [...this.#checkouts.values()].findLast(
      (checkout) => checkout.reference === organizationId && this.#statusOf(checkout) === 'open'
    )
    if (open === undefined) throw nothingToActOn(`Organization ${organizationId} has no open checkout.`)
    return open
  }

  #liveSubscriptionOf(organizationId: string): FakeSubscription {
    const live = [...this.#subscriptions.values()].findLast(
      (subscription) => subscription.reference === organizationId && subscription.status !== 'cancelled'
    )
    if (live === undefined) throw nothingToActOn(`Organization ${organizationId} has no live subscription.`)
    return live
  }

  #subscription(subscriptionId: string): FakeSubscription {
    const subscription = this.#subscriptions.get(subscriptionId)
    if (subscription === undefined) throw new Error(`unknown subscription ${subscriptionId}`)
    return subscription
  }

  /** Every call to the provider passes here: `failNextCall` makes the next one an outage. */
  #call(): void {
    if (!this.#failNext) return
    this.#failNext = false
    throw new BillingProviderUnavailableException('the fake was told to fail')
  }
}
