import { type PayerInput, payerSchema } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type PayerField = keyof PayerInput
export type PayerProblem = 'nameRequired' | 'nameTooLong' | 'taxIdInvalid' | 'emailInvalid'
export type PayerProblems = Partial<Record<PayerField, PayerProblem>>

/** The document as the API takes it: what the owner typed, without dots, dashes, slashes or spaces, in capitals. */
const unpunctuated = (taxId: string) => taxId.replace(/[\s./-]/g, '').toUpperCase()

/** Names the problem of a field, from the contract's own rules: the web never has a second copy of them. */
function problemOf(field: PayerField, value: string): PayerProblem {
  if (field === 'name') return value.trim() === '' ? 'nameRequired' : 'nameTooLong'
  return field === 'taxId' ? 'taxIdInvalid' : 'emailInvalid'
}

/**
 * The payer the API will accept (`payerSchema`), or what to fix, before anything is sent (ADR 0069). The
 * owner may type the CPF or CNPJ with its punctuation, as printed on the document.
 */
export function validatePayer(fields: PayerInput): Checked<PayerInput, PayerProblems> {
  const parsed = payerSchema.safeParse({ ...fields, taxId: unpunctuated(fields.taxId) })
  if (parsed.success) return { ok: true, values: parsed.data }
  const problems: PayerProblems = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as PayerField
    problems[field] ??= problemOf(field, fields[field])
  }
  return { ok: false, problems }
}
