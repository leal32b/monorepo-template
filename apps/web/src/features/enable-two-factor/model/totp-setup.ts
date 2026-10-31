/** Better Auth's answer to turning on two-step verification: an app to set up, or `otp` for codes by email. */
export type EnableAnswer = { method: 'otp' } | { method: 'totp'; totpURI: string; backupCodes: string[] }

export type TotpSetup = {
  /** The `otpauth://` URI: the QR code holds it, and on a phone it opens the authenticator app. */
  uri: string
  /** The secret key, in groups of four, for an app that can neither scan nor open the URI. */
  key: string
  /** Codes that sign in once each without the app; Better Auth shows them only now. */
  backupCodes: string[]
}

/**
 * What the user needs to add the account to an authenticator app, from Better Auth's answer. An
 * answer without a key for an app has nothing to set up: this API sends no codes by email.
 */
export function totpSetupOf(answer: EnableAnswer): TotpSetup | undefined {
  if (answer.method !== 'totp') return undefined
  const secret = new URL(answer.totpURI).searchParams.get('secret')
  if (!secret) return undefined
  return { uri: answer.totpURI, key: secret.replace(/.{4}(?=.)/g, '$& '), backupCodes: answer.backupCodes }
}
