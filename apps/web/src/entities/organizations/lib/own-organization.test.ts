import { ownOrganization } from './own-organization'

describe('ownOrganization (W13)', () => {
  const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }

  it('takes the same organization with its new name or address', () => {
    const renamed = { id: 'org-1', name: 'Acme Inc', slug: 'acme-inc' }

    expect(ownOrganization('org-1', renamed, acme)).toBe(renamed)
  })

  it('keeps its own when another organization comes into view, or none', () => {
    expect(ownOrganization('org-1', { id: 'org-2', name: 'Globex', slug: 'globex' }, acme)).toBe(acme)
    expect(ownOrganization('org-1', undefined, acme)).toBe(acme)
  })
})
