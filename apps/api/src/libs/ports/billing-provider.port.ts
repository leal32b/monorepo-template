import type { Money, PaymentMethod, PlanKey } from '@repo/contracts'
import { UnavailableException } from '#libs/exceptions/exception.base'
import type { WebhookReader } from './webhook-reader.port'

/** A hosted page the owner pays on, opened by the provider: money moves there, never in our request. */
export type Checkout = {
  checkoutId: string
  url: string
  /** Until when the page takes a payment. */
  expiresAt: Date
}

/** Where one payment of a checkout stands: still payable, paid, or no longer payable (expired or withdrawn). */
export type CheckoutPayment = 'open' | 'paid' | 'expired'

/**
 * A subscription as the provider holds it now, in the template's words (ADR 0063). `pending` means it
 * exists and its first charge is not paid yet, so it grants nothing. `reference` is the organization's
 * id, as the API sent it; the job refuses a state whose reference names another organization (T50).
 */
export type ProviderSubscription = {
  subscriptionId: string
  customerId: string
  reference: string
  status: 'pending' | 'active' | 'past_due' | 'cancelled'
  periodStart: Date | null
  paidThrough: Date | null
  /** The due date of the oldest unpaid charge; null when nothing is overdue. */
  overdueSince: Date | null
  cancelAtPeriodEnd: boolean
  price: Money
}

/**
 * What a provider's notice is about, by the provider's ids, once authenticated. The job never applies
 * anything else of it: it reads the provider's current state with these ids (ADR 0063).
 */
export type BillingNotice = {
  eventId: string
  subscriptionId?: string | undefined
  checkoutId?: string | undefined
  customerId?: string | undefined
}

/** Where the provider sends the owner back: the plan page, after paying or after leaving the page. */
type Return = { returnUrl: string; cancelUrl: string }

/**
 * A payment provider, in the template's words, never its own (ADR 0063, ADR 0064). Every method that
 * calls the provider throws `BillingProviderUnavailableException` when it is out of reach or answers
 * with an error of its own, so the route answers 503 and nothing local has changed. No method ever
 * takes card data: the payer types it only on the provider's pages.
 */
export interface BillingProvider extends WebhookReader<BillingNotice> {
  /** The smallest amount the provider accepts for one charge: an upgrade that would cost less is free. */
  readonly minimumCharge: Money
  /**
   * Opens the page where the owner subscribes to `plan`, at the catalogue's price and interval, paying
   * by `method`. It reuses the provider's customer when the row holds one, or finds or creates the one
   * whose reference is the organization, and returns its id.
   */
  startCheckout(
    request: Return & { organizationId: string; plan: PlanKey; method: PaymentMethod; customerId: string | null }
  ): Promise<Checkout & { customerId: string }>
  /** Opens a page for one payment of `amount` (an upgrade's difference), for the customer who holds the subscription. */
  startPayment(
    request: Return & {
      organizationId: string
      customerId: string
      amount: Money
      description: string
      method: PaymentMethod
    }
  ): Promise<Checkout>
  /** Where the payment of one checkout stands; an id the provider does not know is `expired`. */
  payment(checkoutId: string): Promise<CheckoutPayment>
  /**
   * Withdraws an open checkout: its page stops taking money, and whatever it created at the provider
   * that is not paid goes with it. Does nothing to one expired or paid.
   */
  cancelCheckout(checkoutId: string): Promise<void>
  /** A page where the payer pays what is overdue or changes how they pay, or null: the screen then offers a checkout. */
  paymentPage(subscriptionId: string): Promise<string | null>
  /** Sets the price of the subscription's next charges to `plan`'s. Charges nothing now. */
  changePlan(subscriptionId: string, plan: PlanKey): Promise<void>
  /** Ends the subscription now, or when the paid period ends. */
  cancel(subscriptionId: string, options: { atPeriodEnd: boolean }): Promise<void>
  /** Withdraws an end scheduled for the end of the period. */
  resume(subscriptionId: string): Promise<void>
  /** The subscription as the provider holds it now, or null when it does not know the id. */
  subscription(subscriptionId: string): Promise<ProviderSubscription | null>
}

/**
 * A provider that raises notices by itself, as the fake does in development (`autoComplete`): the
 * composition root hands them to the same inbox the webhook route writes to.
 */
export interface NoticeSource {
  listen(deliver: (notice: BillingNotice) => Promise<void>): void
}

/** The provider is out of reach, too slow, or refused a call: nothing changed locally, try again (ADR 0063). */
export class BillingProviderUnavailableException extends UnavailableException {
  readonly code = 'billing_provider_unavailable'

  constructor(reason: string, options: { cause?: unknown } = {}) {
    super(`The payment provider could not answer: ${reason}`, options)
  }
}
