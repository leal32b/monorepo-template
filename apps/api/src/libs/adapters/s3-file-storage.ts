import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage, SignedUpload, StoredFile } from '#libs/ports/file-storage.port'
import { EMPTY_PAYLOAD_HASH, payloadHash, presignUrl, type S3Credentials, signRequest, uriEncode } from './s3/sigv4'

export type S3FileStorageOptions = S3Credentials & {
  /** The S3 API's origin: `https://<account id>.r2.cloudflarestorage.com` on R2, `https://s3.<region>.amazonaws.com` on AWS. */
  endpoint: string
  bucket: string
  clock: Clock
  /** How long to wait for the store before giving up; 10 s by default. */
  timeoutMs?: number
}

/** The keys a `ListObjectsV2` page names, and the token of the next page when it is cut. */
function listed(xml: string): { keys: string[]; next: string | null } {
  const keys = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map(([, key]) => unescapeXml(key as string))
  const next = /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1]
  return { keys, next: next === undefined ? null : unescapeXml(next) }
}

const unescapeXml = (text: string) =>
  text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')

/**
 * Any S3-compatible store (ADR 0076), Cloudflare R2 by default, through `fetch` and a SigV4 signer of our
 * own: no SDK. Path-style addresses, `<endpoint>/<bucket>/<key>`, which every provider accepts. A refusal
 * throws with the call and the status, never a key, a signature or the secret.
 */
export class S3FileStorage implements FileStorage {
  readonly #options: S3FileStorageOptions

  constructor(options: S3FileStorageOptions) {
    this.#options = options
  }

  async signUpload(
    key: string,
    { type, size, expiresInSeconds }: StoredFile & { expiresInSeconds: number }
  ): Promise<SignedUpload> {
    const now = this.#options.clock.now()
    // Both signed: a store that checks signed headers refuses another type or length.
    const signed = { 'Content-Type': type, 'Content-Length': String(size) }
    const url = presignUrl(
      { method: 'PUT', url: this.#url(key), headers: signed, expiresInSeconds, now },
      this.#options
    )
    return {
      url,
      method: 'PUT',
      // The browser sets the length from the body itself, and refuses to be told it.
      headers: { 'Content-Type': type },
      expiresAt: new Date(now.getTime() + expiresInSeconds * 1000)
    }
  }

  async signDownload(
    key: string,
    { signedAt, expiresInSeconds, fileName }: { signedAt: Date; expiresInSeconds: number; fileName?: string }
  ): Promise<string> {
    const url = this.#url(key)
    if (fileName !== undefined)
      url.searchParams.set('response-content-disposition', `attachment; filename="${fileName}"`)
    return presignUrl({ method: 'GET', url, expiresInSeconds, now: signedAt }, this.#options)
  }

  async stat(key: string): Promise<StoredFile | null> {
    const response = await this.#send('HEAD', this.#url(key), 'stat')
    if (response === null) return null
    return {
      size: Number(response.headers.get('content-length')),
      type: response.headers.get('content-type') ?? 'application/octet-stream'
    }
  }

  async read(key: string): Promise<Buffer | null> {
    const response = await this.#send('GET', this.#url(key), 'read')
    return response === null ? null : Buffer.from(await response.arrayBuffer())
  }

  async write(key: string, content: Buffer, { type, cacheControl }: { type: string; cacheControl?: string }) {
    const headers: Record<string, string> = { 'content-type': type }
    if (cacheControl !== undefined) headers['cache-control'] = cacheControl
    await this.#send('PUT', this.#url(key), 'write', { headers, body: content })
  }

  async delete(key: string): Promise<void> {
    // S3 answers 204 whether or not the key existed.
    await this.#send('DELETE', this.#url(key), 'delete')
  }

  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0
    let token: string | null = null
    do {
      const url = new URL(`${this.#options.endpoint}/${uriEncode(this.#options.bucket)}`)
      url.searchParams.set('list-type', '2')
      url.searchParams.set('prefix', prefix)
      if (token !== null) url.searchParams.set('continuation-token', token)
      const response = (await this.#send('GET', url, 'list')) as Response
      const page = listed(await response.text())
      // One by one: an organization has a handful of files, and a batch delete needs a checksum header that
      // providers treat differently.
      for (const key of page.keys) await this.delete(key)
      deleted += page.keys.length
      token = page.next
    } while (token !== null)
    return deleted
  }

  #url(key: string): URL {
    return new URL(`${this.#options.endpoint}/${uriEncode(this.#options.bucket)}/${uriEncode(key, false)}`)
  }

  /** The store's answer, `null` for a 404 on a read, or an error naming the call and the status. */
  async #send(
    method: string,
    url: URL,
    call: string,
    { headers = {}, body }: { headers?: Record<string, string>; body?: Buffer } = {}
  ): Promise<Response | null> {
    const signed = signRequest(
      {
        method,
        url,
        headers,
        payloadHash: body === undefined ? EMPTY_PAYLOAD_HASH : payloadHash(body),
        now: this.#options.clock.now()
      },
      this.#options
    )
    const response = await fetch(url, {
      method,
      headers: signed,
      ...(body === undefined ? {} : { body: new Uint8Array(body) }),
      signal: AbortSignal.timeout(this.#options.timeoutMs ?? 10_000)
    })
    if (response.status === 404 && (method === 'HEAD' || method === 'GET') && call !== 'list') {
      await response.body?.cancel()
      return null
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`The file store refused ${call}: ${response.status}`)
    }
    return response
  }
}
