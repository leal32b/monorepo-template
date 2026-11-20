import {
  logoInputSchema,
  logoLimits,
  logoProblems,
  logoUploadInputSchema,
  organizationLogoSchema,
  signedUploadSchema
} from './organization-logo'

describe('logoLimits (ADR 0076)', () => {
  it('takes a PNG, JPEG or WebP of up to 1 MiB, each side from 64 to 4096 pixels', () => {
    expect(logoLimits).toEqual({
      types: ['image/png', 'image/jpeg', 'image/webp'],
      maxBytes: 1_048_576,
      minSide: 64,
      maxSide: 4096
    })
  })

  it('names each refusal', () => {
    expect(Object.values(logoProblems)).toEqual([
      'logo_upload_missing',
      'logo_too_large',
      'logo_type_unsupported',
      'logo_dimensions',
      'logo_uploads_too_many'
    ])
  })
})

describe('logoUploadInputSchema', () => {
  it.each([[{ type: 'image/png', size: 1 }], [{ type: 'image/webp', size: 1_048_576 }]])('takes %j', (input) => {
    expect(logoUploadInputSchema.parse(input)).toEqual(input)
  })

  it.each([
    ['an SVG', { type: 'image/svg+xml', size: 10 }],
    ['an empty file', { type: 'image/png', size: 0 }],
    ['a file over 1 MiB', { type: 'image/png', size: 1_048_577 }],
    ['a size that is no whole number', { type: 'image/png', size: 1.5 }]
  ])('refuses %s', (_case, input) => {
    expect(logoUploadInputSchema.safeParse(input).success).toBe(false)
  })
})

describe('logoInputSchema', () => {
  it('takes an upload id that is a UUID, and nothing that could name a path', () => {
    expect(logoInputSchema.parse({ uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f' })).toEqual({
      uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f'
    })
    expect(logoInputSchema.safeParse({ uploadId: '../logos/org-2/x' }).success).toBe(false)
  })
})

describe('the answers', () => {
  it('reads a signed upload and a logo', () => {
    const upload = {
      uploadId: '0b8f8a3e-6a4f-4c3a-9a39-2f9f1c1d2e3f',
      url: 'https://store.example.com/files/uploads/org-1/x?X-Amz-Signature=abc',
      headers: { 'Content-Type': 'image/png' },
      expiresAt: '2026-11-20T12:05:00.000Z'
    }
    const logo = { url: '/api/storage/logos/org-1/x?signature=abc', width: 256, height: 128 }

    expect(signedUploadSchema.parse(upload)).toEqual(upload)
    expect(organizationLogoSchema.parse(logo)).toEqual(logo)
  })
})
