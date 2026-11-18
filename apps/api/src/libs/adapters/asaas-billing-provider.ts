import { createHash, timingSafeEqual } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'
import { type Money, type PaymentMethod, type PlanKey, plans } from '@repo/contracts'
import * as z from 'zod/mini'
import {
  type BillingNotice,
  type BillingProvider,
  BillingProviderUnavailableException,
  type Checkout,
  type CheckoutPayment,
  type Payer,
  PayerRequiredException,
  type ProviderSubscription
} from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import { WebhookRefused } from '#libs/ports/webhook-reader.port'

/** How long a checkout's page takes a payment: Asaas accepts 10 to 1440 minutes (ADR 0064). */
const CHECKOUT_MINUTES = 30
/** Days a boleto gives the payer before its due date; a Pix is due the day it is asked for. */
const BOLETO_DAYS_TO_PAY = 3
/** How long one call to Asaas may take before it counts as out of reach (ADR 0047, ADR 0069). */
const DEFAULT_TIMEOUT_MS = 10_000
/** Asaas requires a `User-Agent` from accounts created since 13 June 2024 (its authentication guide). */
const USER_AGENT = 'monorepo-template-api'
/** The header that carries the webhook's token, never the API key's `access_token`. */
const TOKEN_HEADER = 'asaas-access-token'
/** Asaas's dates are calendar dates in Brasília, which has kept −03:00 since 2019. */
const ZONE = 'America/Sao_Paulo'
const OFFSET = '-03:00'

/** A charge counts as paid when confirmed, before its money is available (ADR 0064). */
const PAID = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'])
const OVERDUE = new Set(['OVERDUE', 'DUNNING_REQUESTED'])
const PENDING = 'PENDING'

const billingTypeOf: Record<PaymentMethod, 'CREDIT_CARD' | 'PIX' | 'BOLETO'> = {
  card: 'CREDIT_CARD',
  pix: 'PIX',
  boleto: 'BOLETO'
}

/** The events the webhook subscribes to (ADR 0064): each only makes the job read the subscription again. */
const PAYMENT_EVENTS = new Set([
  'PAYMENT_CREATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_DELETED'
])
const SUBSCRIPTION_EVENTS = new Set([
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_INACTIVATED',
  'SUBSCRIPTION_DELETED'
])
const CHECKOUT_EVENTS = new Set(['CHECKOUT_PAID', 'CHECKOUT_CANCELED', 'CHECKOUT_EXPIRED'])

const text = z.optional(z.nullable(z.string()))
const errorsSchema = z.object({ errors: z.array(z.object({ code: z.optional(z.string()) })) })
const customerSchema = z.object({ id: z.string(), deleted: z.optional(z.boolean()), externalReference: text })
const subscriptionSchema = z.object({
  id: z.string(),
  customer: z.string(),
  status: z.string(),
  value: z.number(),
  billingType: z.string(),
  deleted: z.optional(z.boolean()),
  nextDueDate: text,
  endDate: text,
  externalReference: text
})
const paymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  dueDate: z.string(),
  deleted: z.optional(z.boolean()),
  invoiceUrl: text
})
const checkoutSchema = z.object({ id: z.string(), link: text })
const deletedSchema = z.object({ deleted: z.optional(z.boolean()) })
const pageOf = <T extends z.ZodMiniType>(item: T) => z.object({ data: z.array(item), hasMore: z.optional(z.boolean()) })

/** A notice as Asaas sends it: the event, its id and the object it is about, nothing else read. */
const noticeSchema = z.object({
  id: z.string(),
  event: z.string(),
  payment: z.optional(z.object({ id: z.string(), customer: z.string(), subscription: text })),
  subscription: z.optional(z.object({ id: z.string(), customer: z.string() })),
  checkout: z.optional(z.object({ id: z.string(), customer: text }))
})

type AsaasSubscription = z.output<typeof subscriptionSchema>
type AsaasPayment = z.output<typeof paymentSchema>

export type AsaasBillingOptions = {
  /** `ASAAS_API_KEY`: a secret, sent only in `access_token`, never logged. */
  apiKey: string
  /** `ASAAS_API_URL`: the sandbox's or production's, ending in `/v3`. */
  apiUrl: string
  /** `ASAAS_WEBHOOK_TOKEN`: what every notice carries in `asaas-access-token`. */
  webhookToken: string
  clock: Clock
  /** How long one call may take; 10 s by default. */
  timeoutMs?: number
}

const sha256 = (value: string) => createHash('sha256').update(value).digest()
const reais = (money: Money) => money.amount / 100
const centavos = (value: number): Money => ({ amount: Math.round(value * 100), currency: 'BRL' })
const earliest = (days: string[]) => [...days].sort()[0]
const latest = (days: string[]) => [...days].sort().at(-1)

/** A calendar date of Brasília as the instant it starts. */
const startOf = (day: string) => new Date(`${day}T00:00:00${OFFSET}`)

/** `day` moved by `days` on the calendar. */
function shift(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Where a checkout of the port lives at Asaas, written in its id, since Asaas has no call that reads a
 * checkout back (ADR 0069): an Asaas Checkout with the instant its page lapses, a subscription made by
 * the API for a Pix or a boleto, or a charge made by the API for an upgrade's boleto.
 */
type CheckoutRef =
  | { kind: 'checkout'; id: string; expiresAt: number }
  | { kind: 'subscription'; id: string }
  | { kind: 'payment'; id: string }

function parseCheckoutId(checkoutId: string): CheckoutRef | null {
  const [kind, id, expiresAt] = checkoutId.split(':')
  if (id === undefined || id === '') return null
  if (kind === 'checkout' && expiresAt !== undefined && /^\d+$/.test(expiresAt)) {
    return { kind, id, expiresAt: Number(expiresAt) }
  }
  if ((kind === 'subscription' || kind === 'payment') && expiresAt === undefined) return { kind, id }
  return null
}

type Return = { returnUrl: string; cancelUrl: string }

/**
 * The billing port on Asaas (ADR 0064, ADR 0067, ADR 0069), through its REST API with `fetch`. A card
 * subscribes on an Asaas Checkout, which creates the subscription once paid; a Pix or a boleto on a
 * subscription made by the API, paid on its first charge's invoice. An upgrade's difference is a one-off
 * Checkout for a card or a Pix, and a charge for a boleto. Asaas has no idempotency key: customers and
 * subscriptions are looked up by our reference before one is created, and nothing is retried here (the
 * owner, or the job's backoff, tries again). Every failure is a `BillingProviderUnavailableException`
 * naming the call, its status and Asaas's error codes: never the key, nor the payer's data.
 */
export class AsaasBillingProvider implements BillingProvider {
  readonly name = 'asaas'
  /** R$ 5.00, the smallest charge Asaas's help centre allows (ADR 0064). */
  readonly minimumCharge: Money = { amount: 500, currency: 'BRL' }

  readonly #apiKey: string
  readonly #apiUrl: string
  readonly #token: Buffer
  readonly #clock: Clock
  readonly #timeoutMs: number

  constructor({ apiKey, apiUrl, webhookToken, clock, timeoutMs }: AsaasBillingOptions) {
    this.#apiKey = apiKey
    this.#apiUrl = apiUrl
    this.#token = sha256(webhookToken)
    this.#clock = clock
    this.#timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async startCheckout({
    organizationId,
    plan,
    method,
    customerId,
    payer,
    returnUrl,
    cancelUrl
  }: Parameters<BillingProvider['startCheckout']>[0]): Promise<Checkout & { customerId: string }> {
    const customer = await this.#customer(organizationId, customerId, payer)
    const price = plans[plan].price
    if (method === 'card') {
      await this.#dropUnpaid(customer, organizationId, null)
      const checkout = await this.#openCheckout({
        organizationId,
        customer,
        billingType: 'CREDIT_CARD',
        recurrent: true,
        item: { name: `Plan ${plan}`, description: `Monthly plan ${plan}`, value: reais(price) },
        returnUrl,
        cancelUrl
      })
      return { ...checkout, customerId: customer }
    }
    const billingType = billingTypeOf[method]
    const reused = await this.#dropUnpaid(customer, organizationId, { billingType, value: reais(price) })
    const subscription =
      reused ??
      (await this.#post('/subscriptions', subscriptionSchema, {
        customer,
        billingType,
        value: reais(price),
        nextDueDate: this.#dueDay(method),
        cycle: 'MONTHLY',
        description: `Monthly plan ${plan}`,
        externalReference: organizationId,
        callback: { successUrl: returnUrl, autoRedirect: true }
      }))
    const first = earliestCharge(await this.#chargesOf(subscription.id))
    if (first?.invoiceUrl == null) {
      throw new BillingProviderUnavailableException(`subscription ${subscription.id} has no charge to pay yet`)
    }
    return {
      checkoutId: `subscription:${subscription.id}`,
      url: first.invoiceUrl,
      expiresAt: startOf(shift(first.dueDate, 1)),
      customerId: customer
    }
  }

  async startPayment({
    organizationId,
    customerId,
    amount,
    description,
    method,
    returnUrl,
    cancelUrl
  }: Parameters<BillingProvider['startPayment']>[0]): Promise<Checkout> {
    if (method !== 'boleto') {
      return this.#openCheckout({
        organizationId,
        customer: customerId,
        billingType: method === 'card' ? 'CREDIT_CARD' : 'PIX',
        recurrent: false,
        item: { name: 'Plan upgrade', description, value: reais(amount) },
        returnUrl,
        cancelUrl
      })
    }
    const charge = await this.#post('/payments', paymentSchema, {
      customer: customerId,
      billingType: 'BOLETO',
      value: reais(amount),
      dueDate: this.#dueDay('boleto'),
      description,
      externalReference: organizationId,
      // The boleto cannot be paid once it lapses, so a dropped upgrade takes no money later.
      daysAfterDueDateToRegistrationCancellation: 0,
      callback: { successUrl: returnUrl, autoRedirect: true }
    })
    return {
      checkoutId: `payment:${charge.id}`,
      url: charge.invoiceUrl as string,
      expiresAt: startOf(shift(charge.dueDate, 1))
    }
  }

  async payment(checkoutId: string): Promise<CheckoutPayment> {
    const ref = parseCheckoutId(checkoutId)
    if (ref === null) return 'expired'
    if (ref.kind === 'checkout') {
      const charges = await this.#list('/payments', paymentSchema, { checkoutSession: ref.id })
      if (charges.some((charge) => PAID.has(charge.status))) return 'paid'
      return this.#clock.now().getTime() >= ref.expiresAt ? 'expired' : 'open'
    }
    const live = ref.kind === 'payment' ? await this.#chargeIfLive(ref.id) : await this.#chargesIfLive(ref.id)
    if (live.some((charge) => PAID.has(charge.status))) return 'paid'
    const first = earliestCharge(live)
    return first === undefined || OVERDUE.has(first.status) ? 'expired' : 'open'
  }

  async cancelCheckout(checkoutId: string): Promise<void> {
    const ref = parseCheckoutId(checkoutId)
    if (ref === null) return
    if (ref.kind === 'checkout') {
      // Asaas refuses to cancel a checkout already paid, expired or cancelled: nothing is left to withdraw.
      await this.#call('POST', `/checkouts/${ref.id}/cancel`, checkoutSchema, { body: {}, refused: 'ignore' })
      return
    }
    if ((await this.payment(checkoutId)) === 'paid') return
    await this.#delete(ref.kind === 'payment' ? `/payments/${ref.id}` : `/subscriptions/${ref.id}`)
  }

  async paymentPage(subscriptionId: string): Promise<string | null> {
    const overdue = await this.#list(`/subscriptions/${subscriptionId}/payments`, paymentSchema, { status: 'OVERDUE' })
    return earliestCharge(overdue.filter((charge) => charge.deleted !== true))?.invoiceUrl ?? null
  }

  async changePlan(subscriptionId: string, plan: PlanKey): Promise<void> {
    // Charges already created for the next cycle take the new value too (ADR 0067, sandbox point 10).
    await this.#call('PUT', `/subscriptions/${subscriptionId}`, subscriptionSchema, {
      body: { value: reais(plans[plan].price), updatePendingPayments: true }
    })
  }

  async cancel(subscriptionId: string, { atPeriodEnd }: { atPeriodEnd: boolean }): Promise<void> {
    if (!atPeriodEnd) {
      await this.#delete(`/subscriptions/${subscriptionId}`)
      return
    }
    const { charges, paidThrough } = await this.#period(subscriptionId)
    if (paidThrough === null) {
      await this.#delete(`/subscriptions/${subscriptionId}`)
      return
    }
    // The next period's charge, if already created, goes; no charge falls due after the paid period.
    for (const charge of charges) {
      if (charge.status === PENDING && charge.dueDate >= paidThrough) await this.#delete(`/payments/${charge.id}`)
    }
    await this.#call('PUT', `/subscriptions/${subscriptionId}`, subscriptionSchema, {
      body: { endDate: shift(paidThrough, -1) }
    })
  }

  async resume(subscriptionId: string): Promise<void> {
    const { paidThrough } = await this.#period(subscriptionId)
    // The charge the end removed is created again, on the day the paid period ends.
    await this.#call('PUT', `/subscriptions/${subscriptionId}`, subscriptionSchema, {
      body: { status: 'ACTIVE', endDate: null, ...(paidThrough === null ? {} : { nextDueDate: paidThrough }) }
    })
  }

  async subscription(subscriptionId: string): Promise<ProviderSubscription | null> {
    const subscription = await this.#get(`/subscriptions/${subscriptionId}`, subscriptionSchema)
    if (subscription === null) return null
    const charges = await this.#chargesOf(subscriptionId)
    const reference =
      subscription.externalReference ??
      (await this.#get(`/customers/${subscription.customer}`, customerSchema))?.externalReference ??
      ''
    return this.#state(subscription, charges, reference)
  }

  /**
   * Compares `asaas-access-token` with `ASAAS_WEBHOOK_TOKEN` in constant time, hashed first so the
   * lengths match (ADR 0064), before it reads the body; then takes the event's id and the ids it names.
   * An event the template does not use, or a body it cannot read, is `ignored`: Asaas counts anything
   * but a 200 as a failure, and stops the queue after fifteen.
   */
  async readWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<BillingNotice | 'ignored'> {
    const given = headers[TOKEN_HEADER]
    if (typeof given !== 'string') throw new WebhookRefused('no token')
    if (!timingSafeEqual(sha256(given), this.#token)) throw new WebhookRefused('token does not match')
    let body: unknown
    try {
      body = JSON.parse(rawBody.toString('utf8'))
    } catch {
      return 'ignored'
    }
    const notice = noticeSchema.safeParse(body)
    if (!notice.success) return 'ignored'
    const { id: eventId, event, payment, subscription, checkout } = notice.data
    if (PAYMENT_EVENTS.has(event) && payment !== undefined) {
      const subscriptionId = payment.subscription ?? undefined
      return {
        eventId,
        subscriptionId,
        customerId: payment.customer,
        checkoutId: subscriptionId === undefined ? `payment:${payment.id}` : undefined
      }
    }
    if (SUBSCRIPTION_EVENTS.has(event) && subscription !== undefined) {
      return { eventId, subscriptionId: subscription.id, customerId: subscription.customer }
    }
    // The checkout's id alone cannot name our row, which keeps the page's end with it: its customer does.
    if (CHECKOUT_EVENTS.has(event) && checkout?.customer != null) return { eventId, customerId: checkout.customer }
    return 'ignored'
  }

  /** The customer whose reference is the organization: the one held, the one found, or a new one. */
  async #customer(organizationId: string, held: string | null, payer: Payer | undefined): Promise<string> {
    const known =
      held ??
      (await this.#list('/customers', customerSchema, { externalReference: organizationId })).find(
        (customer) => customer.deleted !== true
      )?.id
    if (known !== undefined) {
      // What the owner typed now is whom the next charges name.
      if (payer !== undefined) {
        await this.#call('PUT', `/customers/${known}`, customerSchema, { body: customerBody(payer) })
      }
      return known
    }
    if (payer === undefined) throw new PayerRequiredException()
    const created = await this.#post('/customers', customerSchema, {
      ...customerBody(payer),
      externalReference: organizationId
    })
    return created.id
  }

  /**
   * The customer's subscriptions of ours never paid (left by a checkout whose answer was lost, or
   * dropped): one that matches `keep` is returned to be used again, the others are deleted, so none
   * keeps charging and notifying the payer.
   */
  async #dropUnpaid(
    customer: string,
    organizationId: string,
    keep: { billingType: string; value: number } | null
  ): Promise<AsaasSubscription | null> {
    const ours = await this.#list('/subscriptions', subscriptionSchema, {
      customer,
      externalReference: organizationId,
      status: 'ACTIVE'
    })
    let reused: AsaasSubscription | null = null
    for (const subscription of ours) {
      const charges = await this.#chargesOf(subscription.id)
      if (charges.some((charge) => PAID.has(charge.status))) continue
      const payable =
        keep !== null &&
        subscription.billingType === keep.billingType &&
        subscription.value === keep.value &&
        !charges.some((charge) => OVERDUE.has(charge.status))
      if (payable && reused === null) reused = subscription
      else await this.#delete(`/subscriptions/${subscription.id}`)
    }
    return reused
  }

  async #openCheckout(
    request: Return & {
      organizationId: string
      customer: string
      billingType: 'CREDIT_CARD' | 'PIX'
      recurrent: boolean
      item: { name: string; description: string; value: number }
    }
  ): Promise<Checkout> {
    const { organizationId, customer, billingType, recurrent, item, returnUrl, cancelUrl } = request
    const checkout = await this.#post('/checkouts', checkoutSchema, {
      billingTypes: [billingType],
      chargeTypes: [recurrent ? 'RECURRENT' : 'DETACHED'],
      minutesToExpire: CHECKOUT_MINUTES,
      externalReference: organizationId,
      customer,
      callback: { successUrl: returnUrl, cancelUrl, expiredUrl: cancelUrl },
      items: [{ ...item, quantity: 1 }],
      ...(recurrent ? { subscription: { cycle: 'MONTHLY', nextDueDate: this.#today() } } : {})
    })
    const expiresAt = new Date(this.#clock.now().getTime() + CHECKOUT_MINUTES * 60 * 1000)
    return {
      checkoutId: `checkout:${checkout.id}:${expiresAt.getTime()}`,
      url: checkout.link ?? `${this.#pagesOrigin()}/checkoutSession/show?id=${checkout.id}`,
      expiresAt
    }
  }

  /** The subscription's charges and the day its paid period ends, as `subscription` reads them. */
  async #period(subscriptionId: string): Promise<{ charges: AsaasPayment[]; paidThrough: string | null }> {
    const subscription = await this.#get(`/subscriptions/${subscriptionId}`, subscriptionSchema)
    if (subscription === null) throw new BillingProviderUnavailableException(`it does not know ${subscriptionId}`)
    const charges = await this.#chargesOf(subscriptionId)
    return { charges, paidThrough: paidThroughOf(subscription, charges) }
  }

  /** ADR 0064's mapping into the template's provider state. */
  #state(subscription: AsaasSubscription, charges: AsaasPayment[], reference: string): ProviderSubscription {
    const lastPaid = latest(charges.filter((charge) => PAID.has(charge.status)).map((charge) => charge.dueDate))
    const paidThroughDay = paidThroughOf(subscription, charges)
    const paidThrough = paidThroughDay === null ? null : startOf(paidThroughDay)
    const overdueDay = earliest(charges.filter((charge) => OVERDUE.has(charge.status)).map((charge) => charge.dueDate))
    const endScheduled = subscription.endDate != null
    const ended =
      subscription.deleted === true ||
      subscription.status === 'INACTIVE' ||
      (subscription.status === 'EXPIRED' && !endScheduled) ||
      (endScheduled && paidThrough !== null && this.#clock.now() >= paidThrough)
    let status: ProviderSubscription['status'] = 'active'
    if (ended) status = 'cancelled'
    else if (lastPaid === undefined) status = 'pending'
    else if (overdueDay !== undefined) status = 'past_due'
    return {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      reference,
      status,
      periodStart: lastPaid === undefined ? null : startOf(lastPaid),
      paidThrough,
      overdueSince: overdueDay === undefined ? null : startOf(overdueDay),
      cancelAtPeriodEnd: endScheduled && !ended,
      price: centavos(subscription.value)
    }
  }

  /** The subscription's charges, every page of them, without the deleted ones. */
  async #chargesOf(subscriptionId: string): Promise<AsaasPayment[]> {
    const charges = await this.#list(`/subscriptions/${subscriptionId}/payments`, paymentSchema, {})
    return charges.filter((charge) => charge.deleted !== true)
  }

  /** The one-off charge, while it exists. */
  async #chargeIfLive(paymentId: string): Promise<AsaasPayment[]> {
    const charge = await this.#get(`/payments/${paymentId}`, paymentSchema)
    return charge === null || charge.deleted === true ? [] : [charge]
  }

  /** The charges of a subscription that still exists; none for one deleted or unknown. */
  async #chargesIfLive(subscriptionId: string): Promise<AsaasPayment[]> {
    const subscription = await this.#get(`/subscriptions/${subscriptionId}`, subscriptionSchema)
    if (subscription === null || subscription.deleted === true || subscription.status !== 'ACTIVE') return []
    return this.#chargesOf(subscriptionId)
  }

  /** Today in Brasília, the day Asaas's dates are written in. */
  #today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(this.#clock.now())
  }

  #dueDay(method: 'pix' | 'boleto'): string {
    return method === 'boleto' ? shift(this.#today(), BOLETO_DAYS_TO_PAY) : this.#today()
  }

  /** Where Asaas serves its pages: `sandbox.asaas.com` for `api-sandbox.asaas.com`, `asaas.com` for `api.asaas.com`. */
  #pagesOrigin(): string {
    const url = new URL(this.#apiUrl)
    url.hostname = url.hostname.replace(/^api-/, '').replace(/^api\./, '')
    return url.origin
  }

  async #get<T extends z.ZodMiniType>(path: string, schema: T): Promise<z.output<T> | null> {
    return this.#call('GET', path, schema, { refused: 'not-found' })
  }

  async #post<T extends z.ZodMiniType>(path: string, schema: T, body: unknown): Promise<z.output<T>> {
    return (await this.#call('POST', path, schema, { body })) as z.output<T>
  }

  /** Deletes what Asaas holds at `path`; one already gone is no failure. */
  async #delete(path: string): Promise<void> {
    await this.#call('DELETE', path, deletedSchema, { refused: 'not-found' })
  }

  /** Every page of a list, 100 at a time, Asaas's largest. */
  async #list<T extends z.ZodMiniType>(
    path: string,
    item: T,
    query: Record<string, string>
  ): Promise<Array<z.output<T>>> {
    const items: Array<z.output<T>> = []
    for (let offset = 0; ; offset += 100) {
      const search = new URLSearchParams({ ...query, offset: String(offset), limit: '100' })
      const page = (await this.#call('GET', `${path}?${search}`, pageOf(item), {})) as {
        data: Array<z.output<T>>
        hasMore?: boolean
      }
      items.push(...page.data)
      if (page.hasMore !== true) return items
    }
  }

  /**
   * One call to Asaas, with the key, the `User-Agent` and a time limit. `refused` says what a 404
   * (`not-found`) or any 4xx (`ignore`) means instead of a failure: `null`. Anything else that is not a
   * 2xx with the expected body is out of reach, named by the call, its status and Asaas's error codes.
   */
  async #call<T extends z.ZodMiniType>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    schema: T,
    { body, refused }: { body?: unknown; refused?: 'not-found' | 'ignore' }
  ): Promise<z.output<T> | null> {
    const call = `${method} ${path.split('?')[0]}`
    let response: Response
    try {
      response = await fetch(`${this.#apiUrl}${path}`, {
        method,
        headers: {
          access_token: this.#apiKey,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(this.#timeoutMs)
      })
    } catch (error) {
      throw new BillingProviderUnavailableException(`${call} did not answer`, { cause: error })
    }
    const json: unknown = await response.json().catch(() => undefined)
    const passes =
      (refused === 'not-found' && response.status === 404) ||
      (refused === 'ignore' && response.status >= 400 && response.status < 500)
    if (passes) return null
    if (!response.ok) {
      const errors = errorsSchema.safeParse(json)
      const codes = errors.success ? errors.data.errors.map((error) => error.code ?? 'unknown').join(',') : 'unknown'
      throw new BillingProviderUnavailableException(`${call} answered ${response.status} ${codes}`)
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) throw new BillingProviderUnavailableException(`${call} answered an unexpected body`)
    return parsed.data
  }
}

/** The customer's fields from what the owner typed: the name and the document Asaas requires (ADR 0069). */
const customerBody = ({ name, taxId, email }: Payer) => ({ name, cpfCnpj: taxId, email })

const earliestCharge = (charges: AsaasPayment[]): AsaasPayment | undefined =>
  [...charges].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

/**
 * The day the paid period ends: the due date of the first charge after the last one paid; with none
 * created yet, the day after a scheduled end, or the subscription's next due date. Null before a payment.
 */
function paidThroughOf(subscription: AsaasSubscription, charges: AsaasPayment[]): string | null {
  const lastPaid = latest(charges.filter((charge) => PAID.has(charge.status)).map((charge) => charge.dueDate))
  if (lastPaid === undefined) return null
  const next = earliest(charges.map((charge) => charge.dueDate).filter((day) => day > lastPaid))
  if (next !== undefined) return next
  if (subscription.endDate != null) return shift(subscription.endDate, 1)
  return subscription.nextDueDate ?? null
}
