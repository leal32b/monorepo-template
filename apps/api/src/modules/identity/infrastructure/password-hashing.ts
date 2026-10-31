import { argon2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const argon2Async = promisify(argon2)

/** OWASP's Argon2id minimum (Password Storage Cheat Sheet): 19 MiB of memory, 2 passes, 1 lane. */
const COST = { memory: 19_456, passes: 2, parallelism: 1 }
const SALT_BYTES = 16
const TAG_BYTES = 32

/** PHC string format, the one every Argon2 library reads and writes. */
const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/

const base64 = (bytes: Buffer): string => bytes.toString('base64').replace(/=+$/, '')

/** Argon2id with a random salt, as a PHC string that carries its own cost, so the cost can grow later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const tag = await argon2Async('argon2id', { message: password, nonce: salt, tagLength: TAG_BYTES, ...COST })
  return `$argon2id$v=19$m=${COST.memory},t=${COST.passes},p=${COST.parallelism}$${base64(salt)}$${base64(tag)}`
}

/** Recomputes with the hash's own salt and cost, compared in constant time; a malformed hash never matches. */
export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const match = PHC.exec(hash)
  if (match === null) return false
  const [memory, passes, parallelism, salt, expected] = match.slice(1) as [string, string, string, string, string]
  const tag = Buffer.from(expected, 'base64')
  const actual = await argon2Async('argon2id', {
    message: password,
    nonce: Buffer.from(salt, 'base64'),
    tagLength: tag.length,
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism)
  })
  return timingSafeEqual(actual, tag)
}
