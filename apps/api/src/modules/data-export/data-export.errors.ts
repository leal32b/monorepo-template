import { exportProblems } from '@repo/contracts'
import { ConflictException, NotFoundException } from '#libs/exceptions/exception.base'

/** The organization's last export was asked for less than 15 minutes ago (ADR 0074): the state says when to ask. */
export class ExportTooSoonException extends ConflictException {
  readonly code = exportProblems.tooSoon

  constructor() {
    super('An export of this organization was asked for a moment ago. Ask again later.')
  }
}

/** No export of this organization is ready to download: none was asked for, it is pending, or it expired. */
export class ExportNotFoundException extends NotFoundException {
  readonly code = exportProblems.notFound

  constructor() {
    super('No export of this organization is ready to download.')
  }
}
