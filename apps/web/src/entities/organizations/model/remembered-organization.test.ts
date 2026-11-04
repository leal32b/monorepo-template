import { rememberOrganization, startingOrganization } from './remembered-organization'

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex' }

describe('startingOrganization', () => {
  afterEach(() => window.localStorage.clear())

  it('starts in the organization last opened on this device', () => {
    rememberOrganization('globex')

    expect(startingOrganization([acme, globex])).toBe(globex)
  })

  it('starts in the first one when the remembered one is no longer the user’s, or none was remembered', () => {
    expect(startingOrganization([acme, globex])).toBe(acme)
    rememberOrganization('initech')
    expect(startingOrganization([acme, globex])).toBe(acme)
  })

  it('has nowhere to start for a user without organizations', () => {
    expect(startingOrganization([])).toBeUndefined()
  })
})
