import { clientErrorReportSchema } from './client-errors'

describe('clientErrorReportSchema', () => {
  const valid = {
    kind: 'render',
    message: 'Cannot read properties of undefined',
    stack: 'TypeError: x\n    at draw (/assets/index-abc.js:1:2)',
    route: '/:organizationSlug/customers/:customerId',
    release: '3e75fa2',
    reference: 'a1b2c3d4e5f6'
  }

  it('accepts a report', () => {
    expect(clientErrorReportSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a report without a stack', () => {
    const { stack: _stack, ...withoutStack } = valid
    expect(clientErrorReportSchema.safeParse(withoutStack).success).toBe(true)
  })

  it('drops a field it does not know, so nothing else reaches the log', () => {
    const parsed = clientErrorReportSchema.safeParse({ ...valid, email: 'a@b.co', url: '/x?token=1' })
    expect(parsed.success && Object.keys(parsed.data).sort()).toEqual(
      ['kind', 'message', 'reference', 'release', 'route', 'stack'].sort()
    )
  })

  it.each([
    ['an unknown kind', { kind: 'console' }],
    ['an empty message', { message: '' }],
    ['a message past 500 characters', { message: 'm'.repeat(501) }],
    ['a stack past 4000 characters', { stack: 's'.repeat(4001) }],
    ['a route that is an address with a query', { route: '/customers?email=a@b.co' }],
    ['a route with a fragment', { route: '/customers#top' }],
    ['a route that is not a path', { route: 'https://example.com/' }],
    ['a route past 200 characters', { route: `/${'a'.repeat(200)}` }],
    ['a release with a space or a line break', { release: 'v1\nforged line' }],
    ['a reference with odd characters', { reference: 'a b' }],
    ['a reference too short to be unique', { reference: 'abc' }]
  ])('rejects %s', (_name, change) => {
    expect(clientErrorReportSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})
