import { type ServerResponse, STATUS_CODES } from 'node:http'
import type { ApiProblem } from '@repo/contracts'
import {
  ArgumentInvalidException,
  ConflictException,
  ExceptionBase,
  NotFoundException
} from '#libs/exceptions/exception.base'

export type ProblemFieldError = { path: string; message: string }

export const PROBLEM_CONTENT_TYPE = 'application/problem+json; charset=utf-8'

/** An error that maps to an HTTP problem response. Anything else becomes a 500. */
export class HttpProblem extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string | undefined
  readonly errors: ProblemFieldError[] | undefined
  readonly headers: Record<string, string>
  /** Seconds to wait before trying again: sent as `Retry-After` and in the body (ADR 0059). */
  readonly retryAfter: number | undefined

  constructor(
    status: number,
    code: string,
    options: {
      detail?: string
      errors?: ProblemFieldError[]
      headers?: Record<string, string>
      retryAfter?: number
    } = {}
  ) {
    super(options.detail ?? code)
    this.status = status
    this.code = code
    this.detail = options.detail
    this.errors = options.errors
    this.retryAfter = options.retryAfter
    this.headers = {
      ...options.headers,
      ...(options.retryAfter === undefined ? {} : { 'Retry-After': String(options.retryAfter) })
    }
  }

  toJSON(requestId?: string): ApiProblem {
    return {
      type: `urn:problem:${this.code}`,
      title: STATUS_CODES[this.status] ?? 'Error',
      status: this.status,
      code: this.code,
      ...(this.detail ? { detail: this.detail } : {}),
      ...(this.errors ? { errors: this.errors } : {}),
      ...(this.retryAfter === undefined ? {} : { retryAfter: this.retryAfter }),
      ...(requestId ? { requestId } : {})
    }
  }
}

/** Unexpected failures: the client learns nothing about internals (the log has the details). */
const internalError = () => new HttpProblem(500, 'internal_error', { detail: 'Unexpected error. See the API log.' })

/** A dependency out of reach or past its time limit (ADR 0047): nothing broke, the client may retry. */
const unavailable = () =>
  new HttpProblem(503, 'service_unavailable', {
    detail: 'The service could not answer in time. Try again in a moment.',
    headers: { 'Retry-After': '5' }
  })

function statusOf(error: ExceptionBase): number | null {
  if (error instanceof NotFoundException) return 404
  if (error instanceof ArgumentInvalidException) return 400
  if (error instanceof ConflictException) return 409
  return null
}

/**
 * The problem an error answers with: HTTP problems as they are, use-case exceptions by family, an
 * error `isUnavailable` recognises as a 503, anything else as an opaque 500. `expected` is false for
 * the last case, which is a bug worth logging with its stack.
 */
export function toProblem(
  error: unknown,
  isUnavailable: (error: unknown) => boolean = () => false
): { problem: HttpProblem; expected: boolean } {
  if (error instanceof HttpProblem) return { problem: error, expected: true }
  if (isUnavailable(error)) return { problem: unavailable(), expected: true }
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

export function sendProblem(res: ServerResponse, problem: HttpProblem, requestId: string): void {
  const payload = JSON.stringify(problem.toJSON(requestId))
  res.writeHead(problem.status, {
    ...problem.headers,
    'Content-Type': PROBLEM_CONTENT_TYPE,
    'Content-Length': Buffer.byteLength(payload)
  })
  res.end(payload)
}
