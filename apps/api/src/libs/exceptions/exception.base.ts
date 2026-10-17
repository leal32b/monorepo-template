/**
 * Expected failures of a use case. Domain and application code throw these without knowing HTTP;
 * the HTTP pipeline maps each family to a status (`libs/http/problem.ts`). Anything that is not an
 * `ExceptionBase` is a bug and becomes a 500.
 */
export abstract class ExceptionBase extends Error {
  /** Stable, machine-readable reason: the problem `code` clients switch on. */
  abstract readonly code: string
  /** Request field the failure is about (reported in the problem's `errors[]`). */
  readonly field: string | undefined

  constructor(message: string, options: { field?: string; cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name
    this.field = options.field
  }
}

/** The resource the request names does not exist (HTTP 404). */
export abstract class NotFoundException extends ExceptionBase {}

/** An argument breaks a rule the request schema cannot express (HTTP 400). */
export abstract class ArgumentInvalidException extends ExceptionBase {}

/** The request is valid but the current state does not allow it (HTTP 409). */
export abstract class ConflictException extends ExceptionBase {}
