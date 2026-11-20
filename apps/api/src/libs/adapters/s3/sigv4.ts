import { createHash, createHmac } from 'node:crypto'

/**
 * AWS Signature Version 4 for the S3 API (ADR 0076), on `node:crypto` and no SDK: the header form for the
 * adapter's own calls, the query form for the addresses it hands to the browser. Every S3-compatible
 * store (R2, S3, B2, MinIO…) checks the same signature.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html
 */
export type S3Credentials = {
  accessKeyId: string
  /** Never logged, never put in an address: it only keys the HMAC. */
  secretAccessKey: string
  /** `auto` on R2. */
  region: string
}

const ALGORITHM = 'AWS4-HMAC-SHA256'

/** The hash of an empty body, which a `GET`, `HEAD` or `DELETE` sends. */
export const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex')

/** A body the signature does not cover: the addresses handed out, whose body the browser sends. */
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD'

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()

/** The SHA-256 of a body, in hex, as `x-amz-content-sha256` carries it. */
export const payloadHash = (body: Buffer) => sha256(body)

/** S3's URI encoding: every byte but `A-Za-z0-9-._~` percent-encoded, `/` too unless it separates a path. */
export function uriEncode(value: string, encodeSlash = true): string {
  const encoded = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return encodeSlash ? encoded : encoded.replaceAll('%2F', '/')
}

/** `20130524T000000Z`. */
const amzDate = (now: Date) =>
  now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** Code-point order, as SigV4 sorts names and values. */
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** `<day>/<region>/s3/aws4_request`: what a signature is valid for. */
const scopeOf = (now: Date, region: string) => `${amzDate(now).slice(0, 8)}/${region}/s3/aws4_request`

const canonicalQuery = (params: [string, string][]) =>
  params
    .map(([name, value]) => [uriEncode(name), uriEncode(value)] as const)
    .sort(([a, x], [b, y]) => order(a, b) || order(x, y))
    .map(([name, value]) => `${name}=${value}`)
    .join('&')

type Canonical = { method: string; url: URL; headers: Record<string, string>; payload: string }

/**
 * The signature of a canonical request: method, the path as sent (already encoded), the sorted query, the
 * signed headers by lowercase name, and the payload's hash.
 */
function sign({ method, url, headers, payload }: Canonical, credentials: S3Credentials, now: Date) {
  const signed = Object.entries({ ...headers, host: url.host })
    .map(([name, value]) => [name.toLowerCase(), value.trim()] as const)
    .sort(([a], [b]) => order(a, b))
  const signedHeaders = signed.map(([name]) => name).join(';')
  const request = [
    method,
    url.pathname,
    canonicalQuery([...url.searchParams]),
    ...signed.map(([name, value]) => `${name}:${value}`),
    '',
    signedHeaders,
    payload
  ].join('\n')
  const day = amzDate(now).slice(0, 8)
  const scope = scopeOf(now, credentials.region)
  const toSign = [ALGORITHM, amzDate(now), scope, sha256(request)].join('\n')
  const key = ['s3', 'aws4_request'].reduce(
    (previous, part) => hmac(previous, part),
    hmac(hmac(`AWS4${credentials.secretAccessKey}`, day), credentials.region)
  )
  return { signature: hmac(key, toSign).toString('hex'), signedHeaders, scope }
}

/**
 * An address that does one request, `method` on `url`, until `expiresInSeconds` after `now`, with no other
 * credential: the browser must send `headers` exactly as signed (a store refuses another `Content-Type` or
 * `Content-Length`). `now` is the signing instant: the same instant gives the same address.
 */
export function presignUrl(
  input: { method: string; url: URL; headers?: Record<string, string>; expiresInSeconds: number; now: Date },
  credentials: S3Credentials
): string {
  const { method, headers = {}, expiresInSeconds, now } = input
  const url = new URL(input.url)
  const signedHeaders = [...Object.keys(headers).map((name) => name.toLowerCase()), 'host'].sort().join(';')
  url.searchParams.set('X-Amz-Algorithm', ALGORITHM)
  url.searchParams.set('X-Amz-Credential', `${credentials.accessKeyId}/${scopeOf(now, credentials.region)}`)
  url.searchParams.set('X-Amz-Date', amzDate(now))
  url.searchParams.set('X-Amz-Expires', String(expiresInSeconds))
  url.searchParams.set('X-Amz-SignedHeaders', signedHeaders)
  const { signature } = sign({ method, url, headers, payload: UNSIGNED_PAYLOAD }, credentials, now)
  // The query as signed, in its canonical encoding, with the signature last.
  url.search = `${canonicalQuery([...url.searchParams])}&X-Amz-Signature=${signature}`
  return url.toString()
}

/** The headers of a request the adapter sends itself: `headers`, the date, the payload's hash and `authorization`. */
export function signRequest(
  input: { method: string; url: URL; headers: Record<string, string>; payloadHash: string; now: Date },
  credentials: S3Credentials
): Record<string, string> {
  const { method, url, payloadHash: payload, now } = input
  const headers = { ...input.headers, 'x-amz-content-sha256': payload, 'x-amz-date': amzDate(now) }
  const { signature, signedHeaders, scope } = sign({ method, url, headers, payload }, credentials, now)
  return {
    ...headers,
    authorization: `${ALGORITHM} Credential=${credentials.accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`
  }
}
