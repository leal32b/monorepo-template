import { validateChangePassword } from './validate-change-password'

const valid = { current: 'an old password', next: 'correct horse battery staple' }

describe('validateChangePassword', () => {
  it('takes the current password as it is, and a new one by the sign-up rules', () => {
    expect(validateChangePassword(valid)).toEqual({ ok: true, values: valid })
  })

  it('asks for the current password, and a new one that meets the rules', () => {
    expect(validateChangePassword({ current: '', next: 'too short' })).toEqual({
      ok: false,
      problems: { current: 'passwordRequired', next: 'passwordTooShort' }
    })
  })

  it('refuses what the API already refused: a wrong current password, a new one found in a breach', () => {
    const refused = { wrong: new Set([valid.current]), breached: new Set([valid.next]) }

    expect(validateChangePassword(valid, refused)).toEqual({
      ok: false,
      problems: { current: 'passwordWrong', next: 'passwordCompromised' }
    })
  })
})
