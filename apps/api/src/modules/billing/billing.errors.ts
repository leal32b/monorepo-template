import { billingProblems } from '@repo/contracts'
import { ConflictException } from '#libs/exceptions/exception.base'

/** Someone changed the subscription after the owner read it (ADR 0048): read it again, then decide. */
export class SubscriptionChangedException extends ConflictException {
  readonly code = billingProblems.changed

  constructor() {
    super('The subscription changed after you read it. Read it again, then try once more.')
  }
}

/** A checkout for another plan is open, or one is being opened: pay it or cancel it first. */
export class CheckoutOpenException extends ConflictException {
  readonly code = billingProblems.checkoutOpen

  constructor() {
    super('A payment is already open for this organization. Pay it or cancel it first.')
  }
}

/** A change of plan, a cancellation or a resumption needs a plan paid for. */
export class SubscriptionNotActiveException extends ConflictException {
  readonly code = billingProblems.notActive

  constructor() {
    super('The organization has no plan paid for. Choose a plan first.')
  }
}

/** The plan ends at the end of the period: keep it before changing it. */
export class CancellationScheduledException extends ConflictException {
  readonly code = billingProblems.cancellationScheduled

  constructor() {
    super('The plan ends at the end of the period. Keep the plan first.')
  }
}

/** A payment is overdue: pay it before changing the plan. */
export class PaymentOverdueException extends ConflictException {
  readonly code = billingProblems.paymentOverdue

  constructor() {
    super('A payment is overdue. Pay it first.')
  }
}

/** A dearer plan goes through the checkout, a cheaper one through the plan (ADR 0063). */
export class PlanChangeNotAllowedException extends ConflictException {
  readonly code = billingProblems.wrongDirection

  constructor(direction: 'upgrade' | 'downgrade') {
    super(
      direction === 'upgrade'
        ? 'A larger plan is paid for first: choose it through the checkout.'
        : 'A smaller plan starts at the end of the period: schedule it through the plan.'
    )
  }
}
