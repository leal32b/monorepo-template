import { logoLimits, logoProblems } from '@repo/contracts'
import { ArgumentInvalidException, ConflictException } from '#libs/exceptions/exception.base'

/** No upload under that id for this organization: never sent, failed, expired, or another organization's. */
export class LogoUploadMissingException extends ConflictException {
  readonly code = logoProblems.uploadMissing

  constructor() {
    super('No upload with this id is waiting for this organization. Upload the file again.')
  }
}

export class LogoTooLargeException extends ArgumentInvalidException {
  readonly code = logoProblems.tooLarge

  constructor() {
    super(`A logo is at most ${logoLimits.maxBytes} bytes.`)
  }
}

/** Its bytes are no PNG, JPEG or WebP, whatever its name or the type it was sent with. */
export class LogoTypeUnsupportedException extends ArgumentInvalidException {
  readonly code = logoProblems.unsupportedType

  constructor() {
    super('A logo is a PNG, JPEG or WebP image.')
  }
}

export class LogoDimensionsException extends ArgumentInvalidException {
  readonly code = logoProblems.dimensions

  constructor() {
    super(`Each side of a logo is from ${logoLimits.minSide} to ${logoLimits.maxSide} pixels.`)
  }
}

/** More uploads signed for this organization than an hour allows (ADR 0076). */
export class LogoUploadsTooManyException extends ConflictException {
  readonly code = logoProblems.tooManyUploads

  constructor() {
    super('Too many uploads for this organization in the last hour. Try again later.')
  }
}
