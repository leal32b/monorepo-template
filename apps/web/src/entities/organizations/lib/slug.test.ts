import { organizationSlugSchema } from '@repo/contracts'
import { slugFromName, withSuffix } from './slug'

describe('slugFromName', () => {
  it.each([
    ['Acme Inc', 'acme-inc'],
    ['Café da María', 'cafe-da-maria'],
    ['  --Hello__World!!  ', 'hello-world'],
    ['Team 42', 'team-42']
  ])('turns %s into %s', (name, slug) => {
    expect(slugFromName(name)).toBe(slug)
  })

  it('cuts a long name at 48 characters, without a hyphen at the end', () => {
    const slug = slugFromName(`${'a'.repeat(47)} bbbbbb`)

    expect(slug).toBe('a'.repeat(47))
    expect(slugFromName('b'.repeat(60))).toHaveLength(48)
  })

  it('falls back to a word when the name has no letter or digit a slug can keep', () => {
    expect(slugFromName('日本語')).toBe('organization')
    expect(slugFromName('!!!')).toBe('organization')
  })

  it('never answers a word the routes use', () => {
    expect(slugFromName('Settings')).toBe('settings-org')
    expect(organizationSlugSchema.safeParse(slugFromName('Login')).success).toBe(true)
  })
})

describe('withSuffix', () => {
  it('adds the suffix after a hyphen', () => {
    expect(withSuffix('acme', 'x7k2')).toBe('acme-x7k2')
  })

  it('makes room for the suffix in a slug that is already at the limit', () => {
    const slug = withSuffix('a'.repeat(48), 'x7k2')

    expect(slug).toHaveLength(48)
    expect(slug.endsWith('-x7k2')).toBe(true)
    expect(organizationSlugSchema.safeParse(slug).success).toBe(true)
  })

  it('does not leave two hyphens where the slug was cut', () => {
    expect(withSuffix(`${'a'.repeat(42)}-bbbbbb`, 'x7k2')).toBe(`${'a'.repeat(42)}-x7k2`)
  })
})
