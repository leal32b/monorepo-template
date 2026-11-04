import { reservedSlugs } from '@repo/contracts'

const MAX_LENGTH = 48

/**
 * The slug a name suggests (ADR 0034): lowercase letters and digits with single hyphens, accents
 * dropped, at most 48 characters. A name with nothing a slug can keep, or that a route uses, still
 * gets a valid slug, so the one-field form of the onboarding never asks for a second field.
 */
export function slugFromName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '')
  if (slug === '') return 'organization'
  return (reservedSlugs as readonly string[]).includes(slug) ? `${slug}-org` : slug
}

/** `slug` with `suffix` after a hyphen, cut to still fit in 48 characters: for a slug someone else took. */
export function withSuffix(slug: string, suffix: string): string {
  return `${slug.slice(0, MAX_LENGTH - suffix.length - 1).replace(/-+$/, '')}-${suffix}`
}
