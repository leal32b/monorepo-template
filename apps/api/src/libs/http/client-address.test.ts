import type { IncomingMessage } from 'node:http'
import { clientAddressOf } from './client-address'

const from = (value: string | string[] | undefined) =>
  clientAddressOf({ headers: value === undefined ? {} : { 'x-client-ip': value } } as unknown as IncomingMessage)

describe('clientAddressOf (ADR 0022, ADR 0059)', () => {
  it('reads the address the Worker reports', () => {
    expect(from('203.0.113.7')).toBe('203.0.113.7')
    expect(from(' 203.0.113.7 ')).toBe('203.0.113.7')
  })

  it('reads an IPv6 address as its /64, however it is written', () => {
    expect(from('2001:db8:12:3400:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:12:3400::/64')
    expect(from('2001:0DB8:0012:3400::1')).toBe('2001:db8:12:3400::/64')
    expect(from('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(from('::1')).toBe('0:0:0:0::/64')
    expect(from('2001:db8:12:3400:5::')).toBe('2001:db8:12:3400::/64')
  })

  it('reads an IPv4 address mapped into IPv6 as the IPv4 address', () => {
    expect(from('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(from('::FFFF:203.0.113.7')).toBe('203.0.113.7')
  })

  it('has none when the header is missing, repeated or not an address', () => {
    expect(from(undefined)).toBeNull()
    expect(from(['203.0.113.7', '203.0.113.8'])).toBeNull()
    expect(from('203.0.113.7, 10.0.0.1')).toBeNull()
    expect(from('not an address')).toBeNull()
    expect(from('')).toBeNull()
  })
})
