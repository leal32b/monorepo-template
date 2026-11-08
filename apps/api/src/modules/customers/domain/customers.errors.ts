import { ConflictException, NotFoundException } from '#libs/exceptions/exception.base'

/** No customer of this organization has the id (also when it belongs to another one). */
export class CustomerNotFoundException extends NotFoundException {
  readonly code = 'customer_not_found'

  constructor() {
    super('No customer of this organization has this id.')
  }
}

/** Another customer of the organization already has this email, archived or not. */
export class CustomerEmailTakenException extends ConflictException {
  readonly code = 'customer_email_taken'

  constructor() {
    super('Another customer of this organization already has this email.', { field: 'email' })
  }
}

/** Someone saved or deleted the customer after the caller read it (ADR 0048): read it again, then decide. */
export class CustomerChangedException extends ConflictException {
  readonly code = 'customer_changed'

  constructor() {
    super('Someone changed this customer after you read it. Read it again, then try once more.')
  }
}

export class CustomerAlreadyArchivedException extends ConflictException {
  readonly code = 'customer_already_archived'

  constructor() {
    super('This customer is already archived.')
  }
}

/** Restoring or deleting asks for an archived customer. */
export class CustomerNotArchivedException extends ConflictException {
  readonly code = 'customer_not_archived'

  constructor() {
    super('Only an archived customer can be restored or deleted. Archive it first.')
  }
}
