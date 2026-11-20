import { createApiClient } from '#shared/api'
import { confirmLogo, removeLogo, signLogoUpload } from './logo-api'

const upload = {
  uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f',
  url: '/api/storage/uploads/org-1/x?signature=s',
  headers: { 'Content-Type': 'image/png' },
  expiresAt: '2026-11-20T12:05:00.000Z'
}
const logo = { url: '/api/storage/logos/org-1/l?signature=s', width: 64, height: 64 }

describe('the organization logo api (ADR 0076)', () => {
  it('signs an upload, confirms it and removes the logo, on the organization’s logo routes', async () => {
    const answers = [Response.json(upload, { status: 201 }), Response.json(logo), new Response(null, { status: 204 })]
    const fetch = vi.fn(async (_path: string, _init?: RequestInit) => answers.shift() as Response)
    const api = createApiClient({ fetch })

    expect(await signLogoUpload(api, 'org 1', { type: 'image/png', size: 10 })).toEqual(upload)
    expect(await confirmLogo(api, 'org 1', upload.uploadId)).toEqual(logo)
    expect(await removeLogo(api, 'org 1')).toBeUndefined()
    expect(fetch.mock.calls.map(([path, init]) => `${init?.method} ${path} ${init?.body ?? ''}`)).toEqual([
      'POST /api/organizations/org%201/logo/uploads {"type":"image/png","size":10}',
      `PUT /api/organizations/org%201/logo {"uploadId":"${upload.uploadId}"}`,
      'DELETE /api/organizations/org%201/logo '
    ])
  })
})
