import { clientErrorReportSchema } from '@repo/contracts'
import { createErrorReporter, sendReport } from './error-reporter'

function setup(options: { cap?: number } = {}) {
  const sent: unknown[] = []
  let count = 0
  const reporter = createErrorReporter({
    send: (report) => sent.push(report),
    release: 'web-3e75fa2',
    reference: () => `ref${String(++count).padStart(9, '0')}`,
    ...options
  })
  return { reporter, sent }
}

describe('createErrorReporter (ADR 0072)', () => {
  it('sends the kind, the message, the stack, the route pattern, the release and a reference, and gives the reference back', () => {
    const { reporter, sent } = setup()
    reporter.setRoute('/:organizationSlug/customers/:customerId')
    const error = new TypeError('x is undefined')

    const reference = reporter.report('render', error)

    expect(reference).toBe('ref000000001')
    expect(sent).toEqual([
      {
        kind: 'render',
        message: 'x is undefined',
        stack: error.stack,
        route: '/:organizationSlug/customers/:customerId',
        release: 'web-3e75fa2',
        reference: 'ref000000001'
      }
    ])
    expect(clientErrorReportSchema.safeParse(sent[0]).success).toBe(true)
  })

  it('reports from the start route until a screen says its own', () => {
    const { reporter, sent } = setup()

    reporter.report('error', new Error('boom'))

    expect(sent).toMatchObject([{ route: '/' }])
  })

  it('reports what was thrown that is not an Error: a string, an object, nothing', () => {
    const { reporter, sent } = setup()

    reporter.report('unhandledrejection', 'plain text')
    reporter.report('unhandledrejection', { code: 42 })
    reporter.report('unhandledrejection', undefined)

    expect(sent).toMatchObject([
      { message: 'plain text', stack: undefined },
      { message: '[object Object]' },
      { message: 'undefined' }
    ])
  })

  it('names an error that has no message by its kind', () => {
    const { reporter, sent } = setup()

    reporter.report('error', new RangeError(''))

    expect(sent).toMatchObject([{ message: 'RangeError' }])
  })

  it('cuts the message and the stack to the contract’s limits', () => {
    const { reporter, sent } = setup()
    const error = new Error('m'.repeat(900))
    error.stack = 's'.repeat(9000)

    reporter.report('error', error)

    expect(clientErrorReportSchema.safeParse(sent[0]).success).toBe(true)
  })

  it('removes email addresses and the query or fragment of an address from what it sends', () => {
    const { reporter, sent } = setup()
    const error = new Error('No customer ana@example.com at https://app.example.com/acme/customers?search=ana#top')
    error.stack = `Error: ${error.message}\n    at load (https://app.example.com/assets/index-a1.js?v=2:1:2)`

    reporter.report('error', error)

    const [report] = sent as Array<{ message: string; stack: string }>
    expect(report?.message).toBe('No customer [email] at https://app.example.com/acme/customers')
    expect(report?.stack).not.toMatch(/example\.com\/assets\/index-a1\.js\?|ana@/)
    expect(`${report?.message}${report?.stack}`).not.toMatch(/search=|#top/)
  })

  it('sends an error that repeats an earlier one once, and gives the first one’s reference again', () => {
    const { reporter, sent } = setup()
    const throwing = () => new Error('boom')

    const first = reporter.report('render', throwing())
    const again = reporter.report('error', throwing())
    reporter.report('error', new Error('another'))

    expect(again).toBe(first)
    expect(sent).toHaveLength(2)
  })

  it('stops sending past its cap, and gives no reference for what it did not send', () => {
    const { reporter, sent } = setup({ cap: 2 })

    const references = [1, 2, 3, 4].map((n) => reporter.report('error', new Error(`boom ${n}`)))

    expect(sent).toHaveLength(2)
    expect(references).toEqual(['ref000000001', 'ref000000002', undefined, undefined])
  })

  it('never throws, even when sending does', () => {
    const reporter = createErrorReporter({
      send: () => {
        throw new Error('offline')
      },
      release: 'dev',
      reference: () => 'ref000000001'
    })

    expect(() => reporter.report('error', new Error('boom'))).not.toThrow()
  })
})

describe('sendReport', () => {
  const report = { kind: 'error', message: 'boom' }

  it('hands the report to the beacon as JSON', async () => {
    const beacon = vi.fn(() => true)
    const fetch = vi.fn()

    sendReport({ url: '/api/client-errors', beacon, fetch }, report as never)

    const [url, blob] = beacon.mock.calls[0] as unknown as [string, Blob]
    expect(url).toBe('/api/client-errors')
    expect(blob.type).toBe('application/json')
    expect(await blob.text()).toBe(JSON.stringify(report))
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['refuses it', () => false],
    [
      'throws',
      () => {
        throw new Error('no')
      }
    ],
    ['is not there', undefined]
  ])('falls back to a keepalive fetch when the beacon %s', (_name, beacon) => {
    const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))

    sendReport({ url: '/api/client-errors', beacon, fetch }, report as never)

    expect(fetch).toHaveBeenCalledWith('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true
    })
  })

  it('swallows a fetch that fails', async () => {
    const fetch = vi.fn(() => Promise.reject(new Error('offline')))

    expect(() => sendReport({ url: '/x', fetch }, report as never)).not.toThrow()
    await Promise.resolve()
  })
})
