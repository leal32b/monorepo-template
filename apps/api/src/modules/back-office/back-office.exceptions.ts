import { backOfficeProblems } from '@repo/contracts'
import { ConflictException, NotFoundException } from '#libs/exceptions/exception.base'

/** No organization has this id (ADR 0077). */
export class OrganizationNotFoundException extends NotFoundException {
  readonly code = 'organization_not_found'

  constructor() {
    super('No organization has this id.')
  }
}

/** The operator is inside another organization already: one visit at a time (ADR 0077). */
export class ImpersonationActiveException extends ConflictException {
  readonly code = backOfficeProblems.impersonationActive

  constructor() {
    super('Leave the organization you are in before entering another.')
  }
}
