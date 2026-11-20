import { mkdtemp } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import pino from 'pino'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { FixedClock } from './fixed-clock'
import { LOCAL_STORAGE_PATH, LocalFileStorage } from './local-file-storage'

const closers: Array<() => void> = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

/** The store on a fresh folder, served by the real pipeline as `pnpm dev` serves it. */
async function start() {
  const clock = new FixedClock(new Date('2026-11-20T12:00:00Z'))
  const root = await mkdtemp(path.join(tmpdir(), 'storage-'))
  const storage = new LocalFileStorage({ root, secret: 'x'.repeat(32), clock })
  const router = new HttpRouter()
  router.get(`${LOCAL_STORAGE_PATH}/*`, storage.serve)
  router.on('PUT', `${LOCAL_STORAGE_PATH}/*`, storage.receive, { rawBody: true })
  const server = createHttpServer({ router, logger: pino({ level: 'silent' }) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => {
    server.close()
    server.closeAllConnections()
  })
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { storage, clock, root, at: (address: string) => `${origin}${address}` }
}

const logo = Buffer.from('a logo of ten')

describe('LocalFileStorage (ADR 0076)', () => {
  it('takes a PUT of what was signed, then serves it at a signed address, as a store does', async () => {
    const { storage, at } = await start()
    const upload = await storage.signUpload('uploads/org-1/u-1', {
      type: 'image/png',
      size: logo.length,
      expiresInSeconds: 300
    })

    expect(upload).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/png' } })
    expect(upload.expiresAt).toEqual(new Date('2026-11-20T12:05:00Z'))
    const put = await fetch(at(upload.url), { method: 'PUT', headers: upload.headers, body: logo })
    expect(put.status).toBe(200)
    expect(await storage.stat('uploads/org-1/u-1')).toEqual({ size: logo.length, type: 'image/png' })

    const address = await storage.signDownload('uploads/org-1/u-1', {
      signedAt: new Date('2026-11-20T00:00:00Z'),
      expiresInSeconds: 86_400
    })
    const got = await fetch(at(address))
    expect(got.headers.get('content-type')).toBe('image/png')
    expect(got.headers.get('content-disposition')).toBeNull()
    expect(Buffer.from(await got.arrayBuffer())).toEqual(logo)
  })

  it('gives the same address for the same signing instant, and names an attachment when asked', async () => {
    const { storage, at } = await start()
    await storage.write('exports/org-1/e-1.zip', logo, { type: 'application/zip', cacheControl: 'private, max-age=60' })
    const options = { signedAt: new Date('2026-11-20T11:59:00Z'), expiresInSeconds: 300 }

    const address = await storage.signDownload('exports/org-1/e-1.zip', { ...options, fileName: 'export.zip' })
    expect(await storage.signDownload('exports/org-1/e-1.zip', { ...options, fileName: 'export.zip' })).toBe(address)

    const got = await fetch(at(address))
    expect(got.headers.get('content-disposition')).toBe('attachment; filename="export.zip"')
    expect(got.headers.get('cache-control')).toBe('private, max-age=60')
    expect(await storage.read('exports/org-1/e-1.zip')).toEqual(logo)
  })

  it('refuses an address that is expired, forged, or signed for another key, method or file', async () => {
    const { storage, clock, at } = await start()
    await storage.write('logos/org-1/l-1', logo, { type: 'image/png' })
    const address = await storage.signDownload('logos/org-1/l-1', { signedAt: clock.now(), expiresInSeconds: 60 })
    const upload = await storage.signUpload('uploads/org-1/u-1', { type: 'image/png', size: 4, expiresInSeconds: 60 })

    expect((await fetch(at(address.replace('l-1', 'l-2')))).status).toBe(403)
    expect((await fetch(at(`${address.slice(0, -2)}xx`))).status).toBe(403)
    expect((await fetch(at(address.replace(/&signature=.*/, '')))).status).toBe(403)
    expect((await fetch(at(upload.url))).status).toBe(403)
    const named = await storage.signDownload('logos/org-1/l-1', {
      signedAt: clock.now(),
      expiresInSeconds: 60,
      fileName: 'a.png'
    })
    expect((await fetch(at(named.replace('a.png', 'b.png')))).status).toBe(403)
    clock.advance(60_000)
    const expired = await fetch(at(address))
    expect(expired.status).toBe(403)
    expect(((await expired.json()) as { detail: string }).detail).toBe('This address has expired.')
  })

  it('refuses an upload of another type or length than signed, and writes nothing', async () => {
    const { storage, at } = await start()
    const upload = await storage.signUpload('uploads/org-1/u-1', { type: 'image/png', size: 4, expiresInSeconds: 60 })

    const wrongType = await fetch(at(upload.url), {
      method: 'PUT',
      headers: { 'Content-Type': 'text/html' },
      body: 'abcd'
    })
    const wrongSize = await fetch(at(upload.url), { method: 'PUT', headers: upload.headers, body: logo })
    const tamperedSize = await fetch(at(upload.url.replace('size=4', `size=${logo.length}`)), {
      method: 'PUT',
      headers: upload.headers,
      body: logo
    })

    expect([wrongType.status, wrongSize.status, tamperedSize.status]).toEqual([403, 403, 403])
    expect(await storage.stat('uploads/org-1/u-1')).toBeNull()
  })

  it('answers 404 for a path that is no key and for a key with nothing at it', async () => {
    const { storage, clock, at } = await start()
    const missing = await storage.signDownload('logos/org-1/none', { signedAt: clock.now(), expiresInSeconds: 60 })

    expect((await fetch(at(`${LOCAL_STORAGE_PATH}/..%2F..%2Fetc%2Fpasswd?expires=1&signature=x`))).status).toBe(404)
    expect((await fetch(at(missing))).status).toBe(404)
    expect(await storage.read('logos/org-1/none')).toBeNull()
    await expect(storage.write('../x', logo, { type: 'image/png' })).rejects.toThrow('Invalid file key')
  })

  it('deletes a key, harmlessly when it is gone, and every key of a prefix', async () => {
    const { storage } = await start()
    expect(await storage.deletePrefix('logos/org-1/')).toBe(0)
    for (const key of ['logos/org-1/a', 'logos/org-1/b', 'logos/org-2/a', 'uploads/org-1/a']) {
      await storage.write(key, logo, { type: 'image/png' })
    }

    await storage.delete('logos/org-1/a')
    await storage.delete('logos/org-1/a')

    expect(await storage.stat('logos/org-1/a')).toBeNull()
    expect(await storage.deletePrefix('logos/org-1/')).toBe(1)
    expect(await storage.deletePrefix('uploads/org-1/')).toBe(1)
    expect(await storage.stat('logos/org-2/a')).not.toBeNull()
  })
})
