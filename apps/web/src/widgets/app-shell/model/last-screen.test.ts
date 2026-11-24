import { createRoot } from 'solid-js'
import { createLastScreens } from './last-screen'

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }
const globex = { ...acme, id: 'org-2', name: 'Globex', slug: 'globex' }

describe('the last product screen of each organization (ADR 0080)', () => {
  const screens = () => createRoot(() => createLastScreens())

  it('is Home until one of the product’s screens was on view', () => {
    expect(screens().of(acme)).toMatchObject({ label: 'home', href: '/acme' })
  })

  it('is the last product screen on view, its address compared as the router does', () => {
    const last = screens()

    last.see('/Acme/customers/', acme)
    last.see('/acme/settings/general', acme)

    expect(last.of(acme)).toMatchObject({ label: 'customers', href: '/acme/customers' })
  })

  it('is kept apart for each organization', () => {
    const last = screens()

    last.see('/acme/customers', acme)
    last.see('/globex', globex)

    expect(last.of(acme)?.label).toBe('customers')
    expect(last.of(globex)?.label).toBe('home')
  })

  it('is Home outside any organization, which picks one', () => {
    const last = screens()
    last.see('/settings/profile', undefined)

    expect(last.of(undefined)).toMatchObject({ label: 'home', href: '/' })
  })
})
