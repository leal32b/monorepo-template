import { validateSignUp } from './validate-sign-up'

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct horse battery staple' }

describe('validateSignUp', () => {
  it('trims the name, and trims and lowercases the email, so a pasted address still works', () => {
    expect(validateSignUp({ ...valid, name: '  Ada Lovelace ', email: ' Ada@Example.COM ' })).toEqual({
      ok: true,
      values: valid
    })
  })

  it('names each field that is wrong, and what is wrong with it', () => {
    expect(validateSignUp({ name: ' ', email: 'ada@', password: 'too short' })).toEqual({
      ok: false,
      problems: { name: 'nameRequired', email: 'emailInvalid', password: 'passwordTooShort' }
    })
    expect(validateSignUp({ ...valid, password: 'x'.repeat(129) })).toEqual({
      ok: false,
      problems: { password: 'passwordTooLong' }
    })
  })

  it('refuses a password the API found in a data breach, until it is changed', () => {
    const breached = new Set([valid.password])

    expect(validateSignUp(valid, breached)).toEqual({ ok: false, problems: { password: 'passwordCompromised' } })
    expect(validateSignUp({ ...valid, password: 'another long passphrase' }, breached).ok).toBe(true)
  })
})
