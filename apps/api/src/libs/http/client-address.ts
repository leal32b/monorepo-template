import type { IncomingMessage } from 'node:http'
import { isIP } from 'node:net'

/** An IPv4 address written inside IPv6, as some proxies report it. */
const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i

const hextet = (group: string): string => Number.parseInt(group, 16).toString(16)

/** The first four groups of an IPv6 address, with `::` written out: the /64 one subscriber is given. */
function subnetOf(address: string): string {
  const [head = '', tail] = address.split('::')
  const left = head === '' ? [] : head.split(':')
  const right = tail === undefined || tail === '' ? [] : tail.split(':')
  const groups = [...left, ...Array.from({ length: 8 - left.length - right.length }, () => '0'), ...right]
  return `${groups.slice(0, 4).map(hextet).join(':')}::/64`
}

/**
 * Who sent the request, as the limiter counts them (ADR 0059): the address in `X-Client-IP`, which
 * only the web Worker sets (ADR 0022). An IPv6 address reads as its /64, so a caller cannot reset a
 * count by moving inside its own block; an IPv4 address mapped into IPv6 reads as the IPv4 address.
 * `null` when the header is missing, repeated or not one address.
 */
export function clientAddressOf(req: IncomingMessage): string | null {
  const header = req.headers['x-client-ip']
  if (typeof header !== 'string') return null
  const address = header.trim()
  const version = isIP(address)
  if (version === 4) return address
  if (version !== 6) return null
  return MAPPED_IPV4.exec(address)?.[1] ?? subnetOf(address)
}
