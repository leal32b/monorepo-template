import { productScreens, screensOf, tabsOf } from './product-screens'

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }

describe('the product’s screens (ADR 0080)', () => {
  it('starts with Home, then each module in the order the side menu draws them', () => {
    expect(productScreens.map((screen) => screen.label)).toEqual(['home', 'customers'])
  })

  it('places each screen under the organization’s slug (ADR 0034)', () => {
    expect(screensOf(acme).map((screen) => [screen.label, screen.href])).toEqual([
      ['home', '/acme'],
      ['customers', '/acme/customers']
    ])
  })

  it('offers only Home, which picks an organization, outside any', () => {
    expect(screensOf(undefined).map((screen) => [screen.label, screen.href])).toEqual([['home', '/']])
  })

  describe('in the tab bar', () => {
    const screen = (label: string) => ({ label, href: `/acme/${label}`, icon: 'home' as const })

    it('gives each of up to three screens a tab of its own', () => {
      const three = [screen('a'), screen('b'), screen('c')]

      expect(tabsOf(three)).toEqual({ tabs: three, more: [] })
    })

    it('keeps two tabs and lists the rest under the third, in their order, past three', () => {
      const four = [screen('a'), screen('b'), screen('c'), screen('d')]

      expect(tabsOf(four)).toEqual({ tabs: four.slice(0, 2), more: four.slice(2) })
    })
  })
})
