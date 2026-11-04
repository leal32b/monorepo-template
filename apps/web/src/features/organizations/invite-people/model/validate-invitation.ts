import { type Checked, cleanEmail } from '#shared/lib'

export type InvitationProblem = 'emailInvalid' | 'alreadyMember'

/**
 * The address to invite, cleaned of spaces and capitals, or what to fix before anything is sent.
 * `memberEmails` holds the addresses of people already in the organization (lower case), and the ones the
 * API said are members: inviting them would only fail.
 */
export function validateInvitation(
  email: string,
  memberEmails: ReadonlySet<string>
): Checked<{ email: string }, { email: InvitationProblem }> {
  const cleaned = cleanEmail(email)
  if (cleaned === undefined) return { ok: false, problems: { email: 'emailInvalid' } }
  if (memberEmails.has(cleaned)) return { ok: false, problems: { email: 'alreadyMember' } }
  return { ok: true, values: { email: cleaned } }
}
