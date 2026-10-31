import { cleanEmail } from '#shared/lib'

export type SignInValues = { email: string; password: string }

export type SignInProblem = 'emailInvalid' | 'passwordRequired'

export type SignInProblems = Partial<Record<keyof SignInValues, SignInProblem>>

export type SignInValidation = { ok: true; values: SignInValues } | { ok: false; problems: SignInProblems }

/**
 * Checks a sign-in before it is sent: an email address and a password, nothing more, because an
 * old password may predate today's rules. The email is cleaned; the password is kept as typed.
 */
export function validateSignIn(input: SignInValues): SignInValidation {
  const email = cleanEmail(input.email)
  const problems: SignInProblems = {}

  if (email === undefined) problems.email = 'emailInvalid'
  if (input.password === '') problems.password = 'passwordRequired'

  if (email === undefined || input.password === '') return { ok: false, problems }
  return { ok: true, values: { email, password: input.password } }
}
