import { passwordLength } from '@repo/contracts'
import { cleanEmail } from '#shared/lib'

export type SignUpValues = { name: string; email: string; password: string }

export type SignUpProblem =
  | 'nameRequired'
  | 'emailInvalid'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'passwordCompromised'

/** What is wrong with each field, for the fields that have something wrong. */
export type SignUpProblems = Partial<Record<keyof SignUpValues, SignUpProblem>>

export type SignUpValidation = { ok: true; values: SignUpValues } | { ok: false; problems: SignUpProblems }

/**
 * Checks a sign-up before it is sent, with the API's own rules, and cleans what is often pasted
 * wrong: spaces around the name and the email, capitals in the email. The password is kept as typed.
 * `breached` holds the passwords the API already found in a data breach, so they are not sent again.
 */
export function validateSignUp(input: SignUpValues, breached: ReadonlySet<string> = new Set()): SignUpValidation {
  const email = cleanEmail(input.email)
  const values = { name: input.name.trim(), email: email ?? '', password: input.password }
  const problems: SignUpProblems = {}

  if (values.name === '') problems.name = 'nameRequired'
  if (email === undefined) problems.email = 'emailInvalid'
  if (values.password.length < passwordLength.min) problems.password = 'passwordTooShort'
  else if (values.password.length > passwordLength.max) problems.password = 'passwordTooLong'
  else if (breached.has(values.password)) problems.password = 'passwordCompromised'

  return Object.keys(problems).length === 0 ? { ok: true, values } : { ok: false, problems }
}
