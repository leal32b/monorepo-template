import { type Checked, type NewPasswordProblem, newPasswordProblem } from '#shared/lib'

export type ChangePasswordValues = { current: string; next: string }

export type ChangePasswordProblems = { current?: 'passwordRequired' | 'passwordWrong'; next?: NewPasswordProblem }

/** What the API already refused, so it is not sent again. */
export type Refused = { wrong: ReadonlySet<string>; breached: ReadonlySet<string> }

/**
 * Checks a change of password before it is sent: the current password, as typed, and a new one by
 * the sign-up's rules. A current password the API said is wrong, or a new one it found in a data
 * breach, is refused here too; the change-password route allows only 3 tries in 10 seconds.
 */
export function validateChangePassword(
  input: ChangePasswordValues,
  refused: Refused = { wrong: new Set(), breached: new Set() }
): Checked<ChangePasswordValues, ChangePasswordProblems> {
  const problems: ChangePasswordProblems = {}

  if (input.current === '') problems.current = 'passwordRequired'
  else if (refused.wrong.has(input.current)) problems.current = 'passwordWrong'
  const next = newPasswordProblem(input.next, refused.breached)
  if (next) problems.next = next

  return Object.keys(problems).length === 0 ? { ok: true, values: input } : { ok: false, problems }
}
