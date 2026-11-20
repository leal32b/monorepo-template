import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import { readBody } from '#libs/http/body'
import { HttpProblem } from '#libs/http/problem'
import type { HttpHandler } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage, SignedUpload, StoredFile } from '#libs/ports/file-storage.port'
import { isKey } from '#libs/storage/keys'

/** Where its addresses point: a path of the API, which Vite's proxy puts on the web's own origin. */
export const LOCAL_STORAGE_PATH = '/api/storage'

export type LocalFileStorageOptions = {
  /** The folder the files live in, created when the first one is written. */
  root: string
  /** Keys the addresses' HMAC; derived from `BETTER_AUTH_SECRET`, so addresses survive a restart. */
  secret: string
  clock: Clock
}

/** What the API kept of a file beside its bytes: `<file>.meta.json`. */
type Meta = { type: string; cacheControl?: string | undefined }

const META = '.meta.json'

/** What an address grants, in the order it is signed. */
type Grant = { method: 'GET' | 'PUT'; key: string; expires: number; type: string; size: string; name: string }

const forbidden = (detail: string) => new HttpProblem(403, 'signature_invalid', { detail })

/**
 * The file store of development and the end-to-end suite (ADR 0076): a folder, and addresses of the API
 * itself signed with an HMAC, so the browser runs the same requests as against a real store (a `PUT` of the
 * file, then a `GET`). Env validation refuses it behind https: a deployed disk is erased by the next deploy.
 * Its two handlers are registered only when it is the store chosen.
 */
export class LocalFileStorage implements FileStorage {
  readonly #root: string
  readonly #secret: string
  readonly #clock: Clock

  constructor({ root, secret, clock }: LocalFileStorageOptions) {
    this.#root = path.resolve(root)
    this.#secret = secret
    this.#clock = clock
  }

  async signUpload(
    key: string,
    { type, size, expiresInSeconds }: StoredFile & { expiresInSeconds: number }
  ): Promise<SignedUpload> {
    const expiresAt = new Date(this.#clock.now().getTime() + expiresInSeconds * 1000)
    const grant: Grant = { method: 'PUT', key, expires: seconds(expiresAt), type, size: String(size), name: '' }
    return { url: this.#address(grant), method: 'PUT', headers: { 'Content-Type': type }, expiresAt }
  }

  async signDownload(
    key: string,
    { signedAt, expiresInSeconds, fileName = '' }: { signedAt: Date; expiresInSeconds: number; fileName?: string }
  ): Promise<string> {
    const expires = seconds(signedAt) + expiresInSeconds
    return this.#address({ method: 'GET', key, expires, type: '', size: '', name: fileName })
  }

  async stat(key: string): Promise<StoredFile | null> {
    const meta = await this.#meta(key)
    if (meta === null) return null
    return { size: (await stat(this.#path(key))).size, type: meta.type }
  }

  async read(key: string): Promise<Buffer | null> {
    return (await this.#meta(key)) === null ? null : readFile(this.#path(key))
  }

  async write(key: string, content: Buffer, { type, cacheControl }: { type: string; cacheControl?: string }) {
    const file = this.#path(key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
    await writeFile(`${file}${META}`, JSON.stringify({ type, cacheControl } satisfies Meta))
  }

  async delete(key: string): Promise<void> {
    const file = this.#path(key)
    await rm(file, { force: true })
    await rm(`${file}${META}`, { force: true })
  }

  async deletePrefix(prefix: string): Promise<number> {
    const entries = await readdir(this.#root, { recursive: true, withFileTypes: true }).catch(() => [])
    const keys = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(META))
      .map((entry) => path.relative(this.#root, path.join(entry.parentPath, entry.name)).slice(0, -META.length))
      .map((relative) => relative.split(path.sep).join('/'))
      .filter((key) => key.startsWith(prefix))
    await Promise.all(keys.map((key) => this.delete(key)))
    return keys.length
  }

  /** `GET /api/storage/*`: the file, as its signed address grants, with its type and, if named, as an attachment. */
  readonly serve: HttpHandler = async (req, res) => {
    const { key, query } = this.#verify(req.url as string, 'GET')
    const meta = await this.#meta(key)
    if (meta === null) throw new HttpProblem(404, 'not_found')
    const content = await readFile(this.#path(key))
    const name = query.get('name') as string
    res.writeHead(200, {
      'Content-Type': meta.type,
      'Content-Length': content.length,
      'Cache-Control': meta.cacheControl ?? 'no-store',
      ...(name === '' ? {} : { 'Content-Disposition': `attachment; filename="${name}"` })
    })
    res.end(content)
  }

  /**
   * `PUT /api/storage/*`: takes the body its signed address grants, exactly that type and that many bytes, as
   * a store that checks signed headers does. The route is registered raw: the body is not JSON.
   */
  readonly receive: HttpHandler = async (req, res: ServerResponse) => {
    const { key, query } = this.#verify(req.url as string, 'PUT')
    const type = query.get('type') as string
    const size = Number(query.get('size'))
    if (req.headers['content-type'] !== type || Number(req.headers['content-length']) !== size) {
      throw forbidden('The file differs in type or length from what was signed.')
    }
    await this.write(key, await readBody(req, size), { type })
    res.writeHead(200).end()
  }

  #address(grant: Grant): string {
    const query = new URLSearchParams({ expires: String(grant.expires) })
    if (grant.method === 'PUT') {
      query.set('type', grant.type)
      query.set('size', grant.size)
    } else if (grant.name !== '') query.set('name', grant.name)
    query.set('signature', this.#signature(grant))
    return `${LOCAL_STORAGE_PATH}/${grant.key}?${query}`
  }

  #signature(grant: Grant): string {
    const { method, key, expires, type, size, name } = grant
    return createHmac('sha256', this.#secret)
      .update([method, key, expires, type, size, name].join('\n'))
      .digest('base64url')
  }

  /** The key and query of an address this store signed for `method`, still valid; a 403 otherwise. */
  #verify(address: string, method: 'GET' | 'PUT'): { key: string; query: URLSearchParams } {
    const url = new URL(address, 'http://local')
    const key = decodeURIComponent(url.pathname.slice(LOCAL_STORAGE_PATH.length + 1))
    const query = url.searchParams
    if (!isKey(key)) throw new HttpProblem(404, 'not_found')
    const grant: Grant = {
      method,
      key,
      expires: Number(query.get('expires')),
      type: method === 'PUT' ? (query.get('type') ?? '') : '',
      size: method === 'PUT' ? (query.get('size') ?? '') : '',
      name: method === 'GET' ? (query.get('name') ?? '') : ''
    }
    const given = Buffer.from(query.get('signature') ?? '')
    const expected = Buffer.from(this.#signature(grant))
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw forbidden('This address was not signed for this request.')
    }
    if (grant.expires <= seconds(this.#clock.now())) throw forbidden('This address has expired.')
    query.set('name', grant.name)
    return { key, query }
  }

  #path(key: string): string {
    if (!isKey(key)) throw new Error('Invalid file key')
    return path.join(this.#root, ...key.split('/'))
  }

  async #meta(key: string): Promise<Meta | null> {
    try {
      return JSON.parse(await readFile(`${this.#path(key)}${META}`, 'utf8')) as Meta
    } catch {
      return null // nothing at this key
    }
  }
}

/** Unix seconds, as the addresses carry their expiry. */
const seconds = (date: Date) => Math.floor(date.getTime() / 1000)
