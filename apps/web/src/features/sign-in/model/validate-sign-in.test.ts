import { validateSignIn } from './validate-sign-in'

describe('validateSignIn', () => {
  it('cleans the email and keeps the password as typed', () => {
    expect(validateSignIn({ email: ' Ada@Example.com ', password: ' an old password ' })).toEqual({
      ok: true,
      values: { email: 'ada@example.com', password: ' an old password ' }
    })
  })

  it('asks only for an email address and a password: an old password may predate the rules', () => {
    expect(validateSignIn({ email: 'ada@', password: '' })).toEqual({
      ok: false,
      problems: { email: 'emailInvalid', password: 'passwordRequired' }
    })
    expect(validateSignIn({ email: 'ada@example.com', password: 'short' }).ok).toBe(true)
  })
})
