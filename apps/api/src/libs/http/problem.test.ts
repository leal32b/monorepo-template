import { apiProblemSchema } from '@template/contracts'
import {
  ArgumentInvalidException,
  ConflictException,
  ExceptionBase,
  NotFoundException
} from '#libs/exceptions/exception.base'
import { HttpProblem, toProblem } from './problem'

class Missing extends NotFoundException {
  readonly code = 'missing'
}
class Invalid extends ArgumentInvalidException {
  readonly code = 'invalid'
}
class Clash extends ConflictException {
  readonly code = 'clash'
}
class Unmapped extends ExceptionBase {
  readonly code = 'unmapped'
}

describe('HttpProblem', () => {
  it('serialises to a valid RFC 9457 problem', () => {
    const body = new HttpProblem(404, 'not_found').toJSON('req-1')

    expect(body).toEqual({
      type: 'urn:problem:not_found',
      title: 'Not Found',
      status: 404,
      code: 'not_found',
      requestId: 'req-1'
    })
    expect(apiProblemSchema.safeParse(body).success).toBe(true)
  })

  it('includes detail and field errors when given', () => {
    const body = new HttpProblem(400, 'validation_failed', {
      detail: 'Invalid.',
      errors: [{ path: 'name', message: 'Required' }]
    }).toJSON()

    expect(body.detail).toBe('Invalid.')
    expect(body.errors).toEqual([{ path: 'name', message: 'Required' }])
    expect(body).not.toHaveProperty('requestId')
  })

  it('falls back to a generic title for an unknown status', () => {
    expect(new HttpProblem(499, 'odd').toJSON().title).toBe('Error')
  })
})

describe('toProblem', () => {
  it('keeps an HttpProblem as it is, as an expected failure', () => {
    const problem = new HttpProblem(405, 'method_not_allowed')

    expect(toProblem(problem)).toEqual({ problem, expected: true })
  })

  it.each([
    [new Missing('No such thing'), 404, 'missing'],
    [new Invalid('Bad value'), 400, 'invalid'],
    [new Clash('Already there'), 409, 'clash']
  ])('maps %o to %i', (error, status, code) => {
    const { problem, expected } = toProblem(error)

    expect(expected).toBe(true)
    expect(problem.status).toBe(status)
    expect(problem.code).toBe(code)
    expect(problem.detail).toBe(error.message)
  })

  it('reports the field of an invalid argument in errors[]', () => {
    const { problem } = toProblem(new Invalid('Too short', { field: 'name' }))

    expect(problem.errors).toEqual([{ path: 'name', message: 'Too short' }])
  })

  it('answers an exception outside the three families as an opaque 500', () => {
    const { problem, expected } = toProblem(new Unmapped('internal detail'))

    expect(expected).toBe(false)
    expect(problem.status).toBe(500)
    expect(problem.code).toBe('internal_error')
    expect(problem.detail).not.toContain('internal detail')
  })

  it('answers any other error as an opaque 500', () => {
    const { problem, expected } = toProblem(new Error('secret'))

    expect(expected).toBe(false)
    expect(problem.status).toBe(500)
    expect(JSON.stringify(problem.toJSON())).not.toContain('secret')
  })
})
