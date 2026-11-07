import { limitReads } from './read-timeout'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** A server that never answers: the request ends only when it is aborted. */
const hanging: Fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
  })

describe('limitReads', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ends a read the server does not answer in time, as a failed request', async () => {
    const fetch = limitReads(hanging, 1000)

    const outcome = expect(fetch('/api/me')).rejects.toMatchObject({ name: 'TimeoutError' })
    await vi.advanceTimersByTimeAsync(1000)

    await outcome
  })

  it('also limits a read that says its method', async () => {
    const outcome = expect(limitReads(hanging, 1000)('/api/me', { method: 'GET' })).rejects.toBeDefined()
    await vi.advanceTimersByTimeAsync(1000)

    await outcome
  })

  it('lets a read that answers in time through, with what the caller passed', async () => {
    const inner = vi.fn<Fetch>(async () => Response.json({ ok: true }))
    const headers = { Accept: 'application/json' }

    const response = await limitReads(inner, 1000)('/api/me', { headers })

    expect(await response.json()).toEqual({ ok: true })
    expect(inner.mock.calls[0]?.[1]?.headers).toBe(headers)
  })

  it('still stops when the caller aborts first', async () => {
    const caller = new AbortController()
    const outcome = expect(limitReads(hanging, 1000)('/api/me', { signal: caller.signal })).rejects.toMatchObject({
      name: 'AbortError'
    })

    caller.abort()

    await outcome
  })

  it('never limits a write: it may have happened even if the answer is late', async () => {
    const inner = vi.fn<Fetch>(async () => Response.json({ ok: true }))

    await limitReads(inner, 1000)('/api/organizations', { method: 'POST', body: '{}' })

    expect(inner.mock.calls[0]?.[1]?.signal).toBeUndefined()
  })
})
