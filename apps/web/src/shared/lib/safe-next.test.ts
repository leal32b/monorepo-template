import { safeNext, withNext } from './safe-next'

const origin = 'https://app.example.com'

describe('withNext', () => {
  it('carries the way back in the address, and nothing when it is home', () => {
    expect(withNext('/login', '/invitations/inv-1')).toBe('/login?next=%2Finvitations%2Finv-1')
    expect(withNext('/login', '/')).toBe('/login')
  })
})

describe('safeNext', () => {
  it('keeps a path on this site, with its query and fragment', () => {
    expect(safeNext('/projects/42?tab=members#top', origin)).toBe('/projects/42?tab=members#top')
  })

  it('goes home instead of to another site, or when there is nowhere to go (T11)', () => {
    const elsewhere = [
      undefined,
      '',
      ['/a', '/b'],
      'https://evil.example/',
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      'javascript:alert(1)'
    ]

    for (const next of elsewhere) expect(safeNext(next, origin), JSON.stringify(next)).toBe('/')
  })
})
