import { identityOptionsSchema, meResponseSchema } from './identity'

describe('meResponseSchema', () => {
  const valid = { id: 'user-1', email: 'ada@example.com', name: 'Ada' }

  it('accepts the signed-in user', () => {
    expect(meResponseSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['an empty id', { id: '' }],
    ['an email that is not one', { email: 'ada' }]
  ])('rejects %s', (_case, change) => {
    expect(meResponseSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})

describe('identityOptionsSchema', () => {
  it('says whether Google sign-in is on', () => {
    expect(identityOptionsSchema.safeParse({ google: true }).success).toBe(true)
    expect(identityOptionsSchema.safeParse({ google: 'yes' }).success).toBe(false)
  })
})
