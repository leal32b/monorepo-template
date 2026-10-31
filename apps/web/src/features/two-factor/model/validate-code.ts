import type { Checked } from '#shared/lib'

export type CodeValues = { code: string }

export type CodeProblem = 'codeInvalid' | 'codeWrong' | 'backupInvalid' | 'backupWrong'

/**
 * Checks the code of the authenticator app before it is sent: six digits, without the spaces or
 * dashes some apps show between them. `rejected` holds the codes the API already said are wrong, so
 * they are not sent again: every wrong try counts towards the lock on the account (T13).
 */
export function validateCode(
  input: CodeValues,
  rejected: ReadonlySet<string> = new Set()
): Checked<CodeValues, { code?: CodeProblem }> {
  const code = input.code.replace(/[\s-]/g, '')
  if (!/^\d{6}$/.test(code)) return { ok: false, problems: { code: 'codeInvalid' } }
  if (rejected.has(code)) return { ok: false, problems: { code: 'codeWrong' } }
  return { ok: true, values: { code } }
}

/**
 * Checks a backup code before it is sent, in Better Auth's shape: ten letters and digits, `abcde-FGHIJ`.
 * Letters are kept as typed, since the check tells capitals apart; the dash is added when it was left
 * out. `rejected` holds the codes the API already said are wrong or used.
 */
export function validateBackupCode(
  input: CodeValues,
  rejected: ReadonlySet<string> = new Set()
): Checked<CodeValues, { code?: CodeProblem }> {
  const typed = input.code.replace(/\s/g, '')
  const code = /^[A-Za-z0-9]{10}$/.test(typed) ? `${typed.slice(0, 5)}-${typed.slice(5)}` : typed
  if (!/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/.test(code)) return { ok: false, problems: { code: 'backupInvalid' } }
  if (rejected.has(code)) return { ok: false, problems: { code: 'backupWrong' } }
  return { ok: true, values: { code } }
}
