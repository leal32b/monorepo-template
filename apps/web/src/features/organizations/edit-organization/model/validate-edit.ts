import { organizationNameSchema, organizationSlugSchema, reservedSlugs } from '@repo/contracts'
import type { Checked } from '#shared/lib'

export type NameProblem = 'nameRequired' | 'nameTooLong'
export type AddressProblem = 'slugRequired' | 'slugInvalid' | 'slugReserved' | 'slugTaken'

/** The name the API will accept (`organizationNameSchema`), or what to fix, before anything is sent. */
export function validateName(name: string): Checked<{ name: string }, { name: NameProblem }> {
  const parsed = organizationNameSchema.safeParse(name)
  if (parsed.success) return { ok: true, values: { name: parsed.data } }
  return { ok: false, problems: { name: name.trim() === '' ? 'nameRequired' : 'nameTooLong' } }
}

/**
 * The address (the slug of ADR 0034) the API will accept, or what to fix. Spaces around it and capitals
 * are cleaned rather than refused. `taken` holds the addresses the API already refused as someone's.
 */
export function validateAddress(
  address: string,
  taken: ReadonlySet<string> = new Set()
): Checked<{ slug: string }, { slug: AddressProblem }> {
  const slug = address.trim().toLowerCase()
  if (slug === '') return { ok: false, problems: { slug: 'slugRequired' } }
  if ((reservedSlugs as readonly string[]).includes(slug)) return { ok: false, problems: { slug: 'slugReserved' } }
  if (!organizationSlugSchema.safeParse(slug).success) return { ok: false, problems: { slug: 'slugInvalid' } }
  if (taken.has(slug)) return { ok: false, problems: { slug: 'slugTaken' } }
  return { ok: true, values: { slug } }
}
