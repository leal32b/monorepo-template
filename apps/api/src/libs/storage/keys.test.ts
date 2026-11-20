import { exportKey, isKey, logoKey, organizationPrefixes, uploadKey } from './keys'

describe('the keys of the file store (ADR 0076)', () => {
  it('puts the kind first, then the organization, then an id the server made', () => {
    expect(uploadKey('org-1', 'u-1')).toBe('uploads/org-1/u-1')
    expect(logoKey('org-1', 'l-1')).toBe('logos/org-1/l-1')
    expect(exportKey('org-1', 'e-1')).toBe('exports/org-1/e-1.zip')
  })

  it('names the three prefixes of an organization, each ending in a slash', () => {
    expect(organizationPrefixes('org-1')).toEqual(['uploads/org-1/', 'logos/org-1/', 'exports/org-1/'])
  })

  it.each([
    ['logos/org-1/l-1', true],
    ['exports/org_A/e-1.zip', true],
    ['logos/org-1/../x', false],
    ['../logos/org-1/x', false],
    ['logos/org-1', false],
    ['/logos/org-1/x', false],
    ['secrets/org-1/x', false],
    ['logos/org 1/x', false],
    ['logos/org-1/.hidden', false]
  ])('tells a key of this shape from any other: %s is %s', (key, valid) => {
    expect(isKey(key)).toBe(valid)
  })

  it('refuses to build a key from an id of any other shape', () => {
    expect(() => logoKey('org/1', 'x')).toThrow('Invalid file key')
    expect(() => uploadKey('org-1', '..')).toThrow('Invalid file key')
  })
})
