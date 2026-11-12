import { publicCustomerRegistrationInputSchema } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type RegistrationField = 'name' | 'email' | 'phone'

/** What the form holds: every field is text, empty when the visitor wrote nothing. */
export type RegistrationFields = Record<RegistrationField, string>

/** A field's own problem, or `contact` for the pair: neither an email nor a phone. */
export type RegistrationProblems = {
  name?: 'nameRequired' | 'nameTooLong'
  email?: 'emailInvalid'
  phone?: 'phoneTooLong'
  contact?: 'contactRequired'
}

/** The registration without the honeypot, which the form adds as it is; a blank contact is left out. */
type RegistrationValues = { name: string; email?: string; phone?: string }

/**
 * What the API will accept (`publicCustomerRegistrationInputSchema`, the same schema it checks), or what
 * to fix, before anything is sent. The schema puts "an email or a phone" at the email; here it is a problem
 * of the pair when both are empty, and the email's own when one was typed and is not an address.
 */
export function validateRegistration(fields: RegistrationFields): Checked<RegistrationValues, RegistrationProblems> {
  const parsed = publicCustomerRegistrationInputSchema.safeParse(fields)
  if (parsed.success) {
    const { name, email, phone } = parsed.data
    return { ok: true, values: { name, ...(email != null && { email }), ...(phone != null && { phone }) } }
  }
  const problems: RegistrationProblems = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as RegistrationField
    if (field === 'name') problems.name ??= fields.name.trim() === '' ? 'nameRequired' : 'nameTooLong'
    else if (field === 'phone') problems.phone = 'phoneTooLong'
    else if (fields.email.trim() === '') problems.contact = 'contactRequired'
    else problems.email = 'emailInvalid'
  }
  return { ok: false, problems }
}
