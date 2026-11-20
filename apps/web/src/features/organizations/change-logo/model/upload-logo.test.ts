import { createApiClient } from '#shared/api'
import { uploadLogo } from './upload-logo'

const upload = {
  uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f',
  url: 'https://store.example.com/files/uploads/org-1/x?X-Amz-Signature=s',
  headers: { 'Content-Type': 'image/png' },
  expiresAt: '2026-11-20T12:05:00.000Z'
}
const logo = { url: 'https://store.example.com/files/logos/org-1/l?X-Amz-Signature=s', width: 64, height: 64 }
const png = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })
const problem = (status: number, code: string) =>
  Response.json({ type: 'about:blank', title: code, status, code }, { status })

/** The API answering in turn, and the store answering `stored`. */
function setUp(answers: Response[], stored: () => Promise<Response> = async () => new Response(null)) {
  const api = createApiClient({ fetch: vi.fn(async () => answers.shift() as Response) })
  const put = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => stored())
  return { api, put }
}

describe('uploadLogo (ADR 0076)', () => {
  it('signs, sends the file straight to the store with the signed headers, then confirms it', async () => {
    const { api, put } = setUp([Response.json(upload, { status: 201 }), Response.json(logo)])

    expect(await uploadLogo(api, 'org-1', png, put as typeof fetch)).toEqual({ logo })
    expect(put).toHaveBeenCalledWith(upload.url, { method: 'PUT', headers: upload.headers, body: png })
  })

  it.each([
    ['an SVG', new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }), 'wrongType'],
    ['an empty file', new File([], 'logo.png', { type: 'image/png' }), 'wrongType'],
    ['a file over 1 MiB', new File([new Uint8Array(1_048_577)], 'logo.png', { type: 'image/png' }), 'tooLarge']
  ])('refuses %s before sending anything', async (_case, file, failure) => {
    const { api, put } = setUp([])

    expect(await uploadLogo(api, 'org-1', file, put as typeof fetch)).toEqual({ failure })
    expect(put).not.toHaveBeenCalled()
  })

  it.each([
    ['the store refused it', async () => new Response(null, { status: 403 })],
    ['the store was out of reach', async () => Promise.reject(new TypeError('Failed to fetch'))]
  ])('says the upload did not finish when %s, and confirms nothing', async (_case, stored) => {
    const answers = [Response.json(upload, { status: 201 })]
    const { api, put } = setUp(answers, stored)

    expect(await uploadLogo(api, 'org-1', png, put as typeof fetch)).toEqual({ failure: 'failed' })
  })

  it.each([
    [problem(400, 'logo_type_unsupported'), 'wrongType'],
    [problem(400, 'logo_too_large'), 'tooLarge'],
    [problem(400, 'logo_dimensions'), 'dimensions'],
    [problem(409, 'logo_upload_missing'), 'failed'],
    [problem(500, 'internal_error'), 'failed']
  ])('says why the API refused the file it checked', async (answer, failure) => {
    const { api, put } = setUp([Response.json(upload, { status: 201 }), answer])

    expect(await uploadLogo(api, 'org-1', png, put as typeof fetch)).toEqual({ failure })
  })

  it('says the upload did not finish when the API is out of reach', async () => {
    const api = createApiClient({ fetch: vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))) })

    expect(await uploadLogo(api, 'org-1', png, vi.fn() as unknown as typeof fetch)).toEqual({ failure: 'failed' })
  })

  it.each([
    [problem(409, 'logo_uploads_too_many'), 'tooMany'],
    [problem(403, 'subscription_read_only'), 'readOnly']
  ])('says why the API would not sign', async (answer, failure) => {
    const { api, put } = setUp([answer])

    expect(await uploadLogo(api, 'org-1', png, put as typeof fetch)).toEqual({ failure })
    expect(put).not.toHaveBeenCalled()
  })

  it('sends with the page’s own fetch unless told otherwise', async () => {
    const stored = vi.fn(async () => new Response(null))
    vi.stubGlobal('fetch', stored)
    const { api } = setUp([Response.json(upload, { status: 201 }), Response.json(logo)])

    await uploadLogo(api, 'org-1', png)

    expect(stored).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })
})
