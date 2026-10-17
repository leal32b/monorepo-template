import { STATUS_CODES } from 'node:http'
import type { ApiProblem } from '@template/contracts'
import {
  ArgumentInvalidException,
  ConflictException,
  ExceptionBase,
  NotFoundException
} from '#libs/exceptions/exception.base'

export type ProblemFieldError = { path: string; message: string }

/** An error that maps to an HTTP problem response. Anything else becomes a 500. */
export class HttpProblem extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string | undefined
  readonly errors: ProblemFieldError[] | undefined

  constructor(status: number, code: string, options: { detail?: string; errors?: ProblemFieldError[] } = {}) {
    super(options.detail ?? code)
    this.status = status
    this.code = code
    this.detail = options.detail
    this.errors = options.errors
  }

  toJSON(requestId?: string): ApiProblem {
    return {
      type: `urn:problem:${this.code}`,
      title: STATUS_CODES[this.status] ?? 'Error',
      status: this.status,
      code: this.code,
      ...(this.detail ? { detail: this.detail } : {}),
      ...(this.errors ? { errors: this.errors } : {}),
      ...(requestId ? { requestId } : {})
    }
  }
}

/** Unexpected failures: the client learns nothing about internals (the log has the details). */
const internalError = () => new HttpProblem(500, 'internal_error', { detail: 'Unexpected error. See the API log.' })

function statusOf(error: ExceptionBase): number | null {
  if (error instanceof NotFoundException) return 404
  if (error instanceof ArgumentInvalidException) return 400
  if (error instanceof ConflictException) return 409
  return null
}

/**
 * The problem an error answers with: HTTP problems as they are, use-case exceptions by family,
 * anything else as an opaque 500. `expected` is false for the last case, which is a bug worth
 * logging.
 */
export function toProblem(error: unknown): { problem: HttpProblem; expected: boolean } {
  if (error instanceof HttpProblem) return { problem: error, expected: true }
  if (!(error instanceof ExceptionBase)) return { problem: internalError(), expected: false }
  const status = statusOf(error)
  if (status === null) return { problem: internalError(), expected: false }
  return {
    problem: new HttpProblem(status, error.code, {
      detail: error.message,
      ...(error.field ? { errors: [{ path: error.field, message: error.message }] } : {})
    }),
    expected: true
  }
}
