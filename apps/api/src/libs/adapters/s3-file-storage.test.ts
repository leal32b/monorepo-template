import { FixedClock } from './fixed-clock'
import { S3FileStorage } from './s3-file-storage'

const options = {
  endpoint: 'https://account.r2.cloudflarestorage.com',
  bucket: 'files',
  region: 'auto',
  accessKeyId: 'key-id',
  secretAccessKey: 'the-secret',
  clock: new FixedClock(new Date('2026-11-20T12:00:00Z'))
}

type Call = { url: string; method: string; headers: Record<string, string>; body: Uint8Array | undefined }

/** `fetch` answering each call in turn, and the calls it got. */
function store(...answers: Response[]) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL, init: RequestInit) => {
      calls.push({
        url: String(url),
        method: init.method as string,
        headers: init.headers as Record<string, string>,
        body: init.body as Uint8Array | undefined
      })
      return answers.shift() as Response
    })
  )
  return calls
}

const storage = () => new S3FileStorage(options)

describe('S3FileStorage (ADR 0076)', () => {
  it('signs an upload whose type and length are part of the signature, and asks the browser for the type only', async () => {
    const upload = await storage().signUpload('uploads/org-1/u-1', {
      type: 'image/png',
      size: 10,
      expiresInSeconds: 300
    })
    const url = new URL(upload.url)

    expect(`${url.origin}${url.pathname}`).toBe('https://account.r2.cloudflarestorage.com/files/uploads/org-1/u-1')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(upload.url).not.toContain('the-secret')
    expect(upload).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/png' } })
    expect(upload.expiresAt).toEqual(new Date('2026-11-20T12:05:00Z'))
  })

  it('signs the same download address for the same instant, and names the attachment when asked', async () => {
    const signedAt = new Date('2026-11-20T00:00:00Z')
    const plain = await storage().signDownload('logos/org-1/l-1', { signedAt, expiresInSeconds: 172_800 })
    const named = new URL(
      await storage().signDownload('exports/org-1/e-1.zip', { signedAt, expiresInSeconds: 300, fileName: 'a.zip' })
    )

    expect(await storage().signDownload('logos/org-1/l-1', { signedAt, expiresInSeconds: 172_800 })).toBe(plain)
    expect(new URL(plain).searchParams.get('X-Amz-Date')).toBe('20261120T000000Z')
    expect(named.searchParams.get('response-content-disposition')).toBe('attachment; filename="a.zip"')
  })

  it('reads a file’s size and type with HEAD, and its bytes with GET, each signed in its headers', async () => {
    const calls = store(
      new Response(null, { headers: { 'Content-Length': '10', 'Content-Type': 'image/png' } }),
      new Response(null, { headers: { 'Content-Length': '3' } }),
      new Response('abc')
    )

    expect(await storage().stat('uploads/org-1/u-1')).toEqual({ size: 10, type: 'image/png' })
    expect(await storage().stat('uploads/org-1/u-2')).toEqual({ size: 3, type: 'application/octet-stream' })
    expect(await storage().read('uploads/org-1/u-1')).toEqual(Buffer.from('abc'))
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      'HEAD https://account.r2.cloudflarestorage.com/files/uploads/org-1/u-1',
      'HEAD https://account.r2.cloudflarestorage.com/files/uploads/org-1/u-2',
      'GET https://account.r2.cloudflarestorage.com/files/uploads/org-1/u-1'
    ])
    expect(calls[0]?.headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=key-id\/20261120\/auto\/s3\/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=[0-9a-f]{64}$/
    )
  })

  it('answers null for a key with nothing at it', async () => {
    store(new Response(null, { status: 404 }), new Response('<Error/>', { status: 404 }))

    expect(await storage().stat('logos/org-1/none')).toBeNull()
    expect(await storage().read('logos/org-1/none')).toBeNull()
  })

  it('writes with the body’s hash, its type and its cache rule, and deletes', async () => {
    const calls = store(new Response(null), new Response(null), new Response(null, { status: 204 }))

    await storage().write('logos/org-1/l-1', Buffer.from('png'), { type: 'image/png', cacheControl: 'private' })
    await storage().write('exports/org-1/e-1.zip', Buffer.from('zip'), { type: 'application/zip' })
    await storage().delete('logos/org-1/l-1')

    expect(calls[0]?.headers).toMatchObject({ 'content-type': 'image/png', 'cache-control': 'private' })
    expect(calls[0]?.headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/)
    expect(Buffer.from(calls[0]?.body as Uint8Array).toString()).toBe('png')
    expect(calls[1]?.headers).not.toHaveProperty('cache-control')
    expect(calls[2]?.method).toBe('DELETE')
  })

  it('deletes every key of a prefix, page after page', async () => {
    const calls = store(
      new Response(
        '<ListBucketResult><Contents><Key>logos/org-1/a</Key></Contents><IsTruncated>true</IsTruncated>' +
          '<NextContinuationToken>next&amp;1</NextContinuationToken></ListBucketResult>'
      ),
      new Response(null, { status: 204 }),
      new Response(
        '<ListBucketResult><Contents><Key>logos/org-1/b&lt;&gt;&quot;&apos;</Key></Contents></ListBucketResult>'
      ),
      new Response(null, { status: 204 })
    )

    expect(await storage().deletePrefix('logos/org-1/')).toBe(2)
    expect(calls.map(({ method, url }) => `${method} ${decodeURIComponent(url)}`)).toEqual([
      'GET https://account.r2.cloudflarestorage.com/files?list-type=2&prefix=logos/org-1/',
      'DELETE https://account.r2.cloudflarestorage.com/files/logos/org-1/a',
      'GET https://account.r2.cloudflarestorage.com/files?list-type=2&prefix=logos/org-1/&continuation-token=next&1',
      `DELETE https://account.r2.cloudflarestorage.com/files/logos/org-1/b<>"'`
    ])
  })

  it('names the call and the status of a refusal, never the key or the secret', async () => {
    store(new Response('<Error>AccessDenied</Error>', { status: 403 }), new Response(null, { status: 404 }))

    await expect(storage().write('logos/org-1/l-1', Buffer.from('x'), { type: 'image/png' })).rejects.toThrow(
      'The file store refused write: 403'
    )
    await expect(storage().deletePrefix('logos/org-1/')).rejects.toThrow('The file store refused list: 404')
  })
})
