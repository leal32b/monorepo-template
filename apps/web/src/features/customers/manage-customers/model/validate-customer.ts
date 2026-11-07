import { type CustomerInput, customerInputSchema } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type CustomerField = 'name' | 'email' | 'phone' | 'company' | 'notes'
export type CustomerProblem =
  | 'nameRequired'
  | 'nameTooLong'
  | 'emailInvalid'
  | 'phoneTooLong'
  | 'companyTooLong'
  | 'notesTooLong'
export type CustomerProblems = Partial<Record<CustomerField, CustomerProblem>>

/** What the form holds: every field is text, empty when the user wrote nothing. */
export type CustomerFields = Record<CustomerField, string>

/** Names the problem of a field, from the contract's own rules: the web never has a second copy of them. */
function problemOf(field: CustomerField, value: string): CustomerProblem {
  if (field === 'name') return value.trim() === '' ? 'nameRequired' : 'nameTooLong'
  if (field === 'email') return 'emailInvalid'
  return `${field}TooLong`
}

/**
 * The customer the API will accept (`customerInputSchema`), or what to fix, before anything is sent. A
 * blank optional field is left out, the email is cleaned, and every field at fault is reported together.
 */
export function validateCustomer(fields: CustomerFields): Checked<CustomerInput, CustomerProblems> {
  const parsed = customerInputSchema.safeParse(fields)
  if (parsed.success) {
    const { name, email, phone, company, notes } = parsed.data
    return {
      ok: true,
      values: {
        name,
        ...(email != null && { email }),
        ...(phone != null && { phone }),
        ...(company != null && { company }),
        ...(notes != null && { notes })
      }
    }
  }
  const problems: CustomerProblems = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as CustomerField
    problems[field] ??= problemOf(field, fields[field])
  }
  return { ok: false, problems }
}
