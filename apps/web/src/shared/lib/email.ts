import { z } from 'zod'

/** The email check Better Auth runs, so the web refuses no address the API takes. */
const email = z.email()

/**
 * The address the user meant, without the spaces and capitals often pasted with it, or `undefined`
 * when it is not an address Better Auth takes.
 */
export function cleanEmail(raw: string): string | undefined {
  const cleaned = raw.trim().toLowerCase()
  return email.safeParse(cleaned).success ? cleaned : undefined
}
