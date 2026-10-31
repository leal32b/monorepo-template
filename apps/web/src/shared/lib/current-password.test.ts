import { currentPasswordProblem } from './current-password'

describe('currentPasswordProblem', () => {
  it('takes any password, as it was typed: its rules were checked when it was chosen', () => {
    expect(currentPasswordProblem(' short ')).toBeUndefined()
  })

  it('asks for one, and refuses one the API already said is wrong', () => {
    expect(currentPasswordProblem('')).toBe('passwordRequired')
    expect(currentPasswordProblem('an old password', new Set(['an old password']))).toBe('passwordWrong')
  })
})
