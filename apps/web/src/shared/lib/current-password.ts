/** What can be wrong with a password typed to confirm it is the user. */
export type CurrentPasswordProblem = 'passwordRequired' | 'passwordWrong'

/**
 * Checks a password typed to confirm it is the user, before it is sent: something typed, as typed,
 * since its rules were checked when it was chosen; and not one the API already said is wrong, since
 * every try counts towards the rate limit.
 */
export function currentPasswordProblem(
  password: string,
  wrong: ReadonlySet<string> = new Set()
): CurrentPasswordProblem | undefined {
  if (password === '') return 'passwordRequired'
  if (wrong.has(password)) return 'passwordWrong'
  return undefined
}
