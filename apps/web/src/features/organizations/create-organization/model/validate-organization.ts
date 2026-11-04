import { organizationNameSchema } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type OrganizationValues = { name: string }
export type OrganizationProblem = 'nameRequired' | 'nameTooLong'

/** The name the API will accept (`organizationNameSchema`), or what to fix, before anything is sent. */
export function validateOrganization(name: string): Checked<OrganizationValues, { name: OrganizationProblem }> {
  const parsed = organizationNameSchema.safeParse(name)
  if (parsed.success) return { ok: true, values: { name: parsed.data } }
  return {
    ok: false,
    problems: { name: name.trim() === '' ? 'nameRequired' : 'nameTooLong' }
  }
}
