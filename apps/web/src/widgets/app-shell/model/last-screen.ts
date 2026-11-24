import { createSignal } from 'solid-js'
import type { Organization } from '#entities/organizations'
import { samePath } from './marked-path'
import { type ProductScreen, type ProductScreenLabel, screensOf } from './product-screens'

export type LastScreens = {
  /** A screen came on view: kept when it is one of the product's screens of its organization. */
  see: (pathname: string, organization: Organization | undefined) => void
  /** The product screen of the organization last on view, else its Home: where the settings go back to. */
  of: (organization: Organization | undefined) => ProductScreen
}

/**
 * The last product screen on view in each organization, for the settings' way back ("Back to Customers",
 * ADR 0080). Kept by the frame while it lives: a fresh load into the settings goes back to Home.
 */
export function createLastScreens(): LastScreens {
  const [last, setLast] = createSignal<Record<string, ProductScreenLabel>>({})
  return {
    see: (pathname, organization) => {
      const seen = screensOf(organization).find((screen) => samePath(screen.href, pathname))
      if (organization !== undefined && seen !== undefined)
        setLast((kept) => ({ ...kept, [organization.slug]: seen.label }))
    },
    of: (organization) => {
      const screens = screensOf(organization)
      const label = organization === undefined ? 'home' : (last()[organization.slug] ?? 'home')
      return screens.find((screen) => screen.label === label) as ProductScreen
    }
  }
}
