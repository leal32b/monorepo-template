import { accountSettings, organizationSettings, settingsListOf } from './settings-items'

describe('the settings (ADR 0080)', () => {
  it('lists the organization’s in the order a manager looks for them', () => {
    expect(organizationSettings('/acme').map((item) => [item.label, item.href])).toEqual([
      ['general', '/acme/settings/general'],
      ['members', '/acme/settings/members'],
      ['roles', '/acme/settings/roles'],
      ['billing', '/acme/settings/billing'],
      ['activity', '/acme/settings/activity']
    ])
  })

  it('lists the person’s three', () => {
    expect(accountSettings.map((item) => item.href)).toEqual([
      '/settings/profile',
      '/settings/security',
      '/settings/preferences'
    ])
  })

  describe('the list a settings screen goes back to on phones', () => {
    it('is You for one of the person’s settings', () => {
      expect(settingsListOf('/settings/security')).toEqual({ href: '/settings', label: 'you' })
    })

    it('is the organization’s settings for one of its own', () => {
      expect(settingsListOf('/acme/settings/members/')).toEqual({
        href: '/acme/settings',
        label: 'organizationSettings'
      })
    })

    it('is none for a list itself, or a screen outside the settings', () => {
      for (const path of ['/settings', '/acme/settings', '/acme', '/acme/customers', '/onboarding'])
        expect(settingsListOf(path)).toBeUndefined()
    })
  })
})
