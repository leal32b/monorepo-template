import { callApi } from './call-api'
import { ApiError } from './client'

describe('callApi', () => {
  it('returns nothing when the call succeeds', async () => {
    expect(await callApi(async () => 'done')).toBeUndefined()
  })

  it("returns the problem's status and code with the request id it carries", async () => {
    const problem = { type: 'x', title: 'Conflict', status: 409, code: 'customer_email_taken', requestId: 'req-1' }

    const failure = await callApi(async () => {
      throw new ApiError('http', 'The API answered 409.', { status: 409, problem })
    })

    expect(failure).toEqual({ status: 409, code: 'customer_email_taken', requestId: 'req-1' })
  })

  it('keeps the seconds a 429 says to wait (ADR 0059)', async () => {
    const problem = { type: 'x', title: 'Too many', status: 429, code: 'rate_limited', retryAfter: 45 }

    const failure = await callApi(async () => {
      throw new ApiError('http', 'The API answered 429.', { status: 429, problem })
    })

    expect(failure).toEqual({ status: 429, code: 'rate_limited', requestId: undefined, retryAfter: 45 })
  })

  it('returns the status alone when the answer was not a problem', async () => {
    const failure = await callApi(async () => {
      throw new ApiError('http', 'The API answered 502.', { status: 502 })
    })

    expect(failure).toEqual({ status: 502, code: undefined, requestId: undefined })
  })

  it('returns a failure without a status when the API could not be reached, or answered out of contract', async () => {
    const unreachable = new ApiError('network', 'The API could not be reached.')
    const unreadable = new ApiError('contract', 'The response does not satisfy its contract.', { status: 200 })

    expect(await callApi(() => Promise.reject(unreachable))).toEqual({
      status: undefined,
      code: undefined,
      requestId: undefined
    })
    expect(await callApi(() => Promise.reject(unreadable))).toEqual({
      status: undefined,
      code: undefined,
      requestId: undefined
    })
  })
})
