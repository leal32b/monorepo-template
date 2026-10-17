import { apiProblemSchema } from './problem'

describe('apiProblemSchema', () => {
  const valid = {
    type: 'urn:problem:not_found',
    title: 'Not Found',
    status: 404,
    code: 'not_found'
  }

  it('accepts a minimal problem', () => {
    expect(apiProblemSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts the optional detail, field errors and request id', () => {
    const result = apiProblemSchema.safeParse({
      ...valid,
      status: 400,
      code: 'validation_failed',
      detail: 'The request is invalid.',
      errors: [{ path: 'name', message: 'Required' }],
      requestId: 'abc-123'
    })

    expect(result.success).toBe(true)
  })

  it.each([200, 399, 600])('rejects the status %i (not an error status)', (status) => {
    expect(apiProblemSchema.safeParse({ ...valid, status }).success).toBe(false)
  })

  it('rejects a non-integer status', () => {
    expect(apiProblemSchema.safeParse({ ...valid, status: 404.5 }).success).toBe(false)
  })

  it('rejects a field error without a message', () => {
    const result = apiProblemSchema.safeParse({ ...valid, errors: [{ path: 'name' }] })

    expect(result.success).toBe(false)
  })
})
