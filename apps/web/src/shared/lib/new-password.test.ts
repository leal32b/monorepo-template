import { newPasswordProblem } from './new-password'

describe('newPasswordProblem', () => {
  it('takes a password of 15 to 128 characters, of any kind', () => {
    expect(newPasswordProblem('correct horse battery staple')).toBeUndefined()
    expect(newPasswordProblem('x'.repeat(15))).toBeUndefined()
  })

  it('says what is wrong: too short, too long, or already found in a data breach', () => {
    expect(newPasswordProblem('x'.repeat(14))).toBe('passwordTooShort')
    expect(newPasswordProblem('x'.repeat(129))).toBe('passwordTooLong')
    expect(newPasswordProblem('correct horse battery staple', new Set(['correct horse battery staple']))).toBe(
      'passwordCompromised'
    )
  })
})
