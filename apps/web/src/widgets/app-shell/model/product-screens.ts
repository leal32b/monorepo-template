import type { IconName } from '@repo/ui'
import { homeOf, type Organization } from '#entities/organizations'

/**
 * The product's own screens, in the order the side menu draws them (ADR 0080): the one list the side menu,
 * the tab bar and the palette read. A module adds itself here, with its words at `appShell.nav.<label>` and
 * `appShell.palette.keywords.<label>`; its `path` follows the organization's slug (ADR 0034).
 */
export const productScreens = [
  { path: '', label: 'home', icon: 'home' },
  { path: '/customers', label: 'customers', icon: 'customers' }
] as const satisfies readonly { path: string; label: string; icon: IconName }[]

export type ProductScreenLabel = (typeof productScreens)[number]['label']

/** A screen of the product, with its address in an organization. */
export type ProductScreen<Label extends string = ProductScreenLabel> = { href: string; label: Label; icon: IconName }

/** The product's screens in an organization; outside any, only Home, whose `/` picks one. */
export const screensOf = (organization: Organization | undefined): ProductScreen[] =>
  organization === undefined
    ? [{ href: homeOf(undefined), label: 'home', icon: 'home' }]
    : productScreens.map((screen) => ({
        href: `${homeOf(organization)}${screen.path}`,
        label: screen.label,
        icon: screen.icon
      }))

/** As many of the product's screens as the tab bar holds beside Search and You. */
const tabRoom = 3

/**
 * The product's screens in the tab bar (ADR 0080): each its own tab while they fit in three; past that two
 * tabs, and the rest under a third, "Modules", in the side menu's order.
 */
export function tabsOf<Screen>(screens: Screen[]): { tabs: Screen[]; more: Screen[] } {
  return screens.length <= tabRoom
    ? { tabs: screens, more: [] }
    : { tabs: screens.slice(0, tabRoom - 1), more: screens.slice(tabRoom - 1) }
}
