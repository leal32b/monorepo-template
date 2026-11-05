import { passwordLength } from '@repo/contracts'

export type NewPasswordProblem = 'passwordTooShort' | 'passwordTooLong' | 'passwordCompromised'

/**
 * What is wrong with a new password, by the API's own rules: its length (`passwordLength`), and being
 * one the API already found in a data breach (`breached`); `undefined` when nothing is.
 */
export function newPasswordProblem(
  password: string,
  breached: ReadonlySet<string> = new Set()
): NewPasswordProblem | undefined {
  if (password.length < passwordLength.min) return 'passwordTooShort'
  if (password.length > passwordLength.max) return 'passwordTooLong'
  if (breached.has(password)) return 'passwordCompromised'
  return undefined
}
