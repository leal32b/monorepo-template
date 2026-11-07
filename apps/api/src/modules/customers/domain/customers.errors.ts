import { ConflictException } from '#libs/exceptions/exception.base'

/** Another customer of the organization already has this email, archived or not. */
export class CustomerEmailTakenException extends ConflictException {
  readonly code = 'customer_email_taken'

  constructor() {
    super('Another customer of this organization already has this email.', { field: 'email' })
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
