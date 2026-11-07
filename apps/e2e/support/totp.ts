import { createHmac } from 'node:crypto'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function decodeBase32(text: string): Buffer {
  let bits = ''
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    bits += BASE32.indexOf(char).toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)))
}

/** The 6-digit code an authenticator app shows now for this key (RFC 6238: SHA-1, 30 s). */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)))
  const hash = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = (hash.at(-1) ?? 0) & 0xf
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}
