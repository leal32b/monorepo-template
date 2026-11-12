import { OWNER_STATE } from '../support/env'
import { expect, seriousViolations, test } from '../support/test'

/** Screens anyone can open; `heading` tells when each has drawn. */
const ENTRY = [
  { path: '/login', heading: 'Sign in' },
  { path: '/signup', heading: 'Create your account' },
  { path: '/forgot-password', heading: 'Reset your password' },
  { path: '/reset-password?token=expired', heading: 'Choose a new password' },
  { path: '/p/no-such-organization', heading: 'There is no page at this address' }
]

/** Screens of the signed-in owner; `:org` is the organization's address. */
const APP = [
  { path: '/:org', heading: 'Home' },
  { path: '/:org/customers', heading: 'Customers' },
  { path: '/:org/settings/general', heading: 'General' },
  { path: '/:org/settings/members', heading: 'Members' },
  { path: '/:org/settings/roles', heading: 'Roles' },
  { path: '/:org/settings/activity', heading: 'Activity' },
  { path: '/onboarding', heading: 'Create an organization' },
  { path: '/settings/profile', heading: 'Profile' },
  { path: '/settings/security', heading: 'Security' },
  { path: '/settings/preferences', heading: 'Preferences' },
  { path: '/no-such-page', heading: 'Page not found' }
]

/** Panels and dialogs that open over a screen: the button that opens each, and what it shows. */
const LAYERS = [
  { path: '/:org/customers', open: 'Add', shows: 'Add customer' },
  { path: '/:org/settings/members', open: 'Invite people', shows: 'Send invitation' },
  { path: '/:org/settings/roles', open: 'Create role', shows: 'Role name' }
]

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test.describe('signed out', () => {
      for (const screen of ENTRY) {
        test(`${screen.path} has no serious axe violation`, async ({ page }) => {
          await page.goto(screen.path)
          await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
          expect(await seriousViolations(page)).toEqual([])
        })
      }
    })

    test.describe('signed in', () => {
      test.use({ storageState: OWNER_STATE })
      let org = ''
      test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
        org = new URL(page.url()).pathname.slice(1)
      })

      for (const screen of APP) {
        test(`${screen.path} has no serious axe violation`, async ({ page }) => {
          await page.goto(screen.path.replace(':org', org))
          await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
          expect(await seriousViolations(page)).toEqual([])
        })
      }

      for (const layer of LAYERS) {
        test(`${layer.path}: "${layer.open}" open has no serious axe violation`, async ({ page }) => {
          await page.goto(layer.path.replace(':org', org))
          await page.getByRole('button', { name: layer.open, exact: true }).click()
          await expect(page.getByText(layer.shows, { exact: true }).first()).toBeVisible()
          expect(await seriousViolations(page)).toEqual([])
        })
      }

      // A tenant's public page is the same for anyone (ADR 0060): the owner's address is the one known here.
      test('/p/:org, the public page, has no serious axe violation, nor once its form says what to fix', async ({
        page
      }) => {
        await page.goto(`/p/${org}`)
        await expect(page.getByRole('heading', { name: 'Become a customer', level: 1 })).toBeVisible()
        expect(await seriousViolations(page)).toEqual([])
        await page.getByRole('button', { name: 'Send my details' }).click()
        await expect(page.getByText('Enter your name.')).toBeVisible()
        expect(await seriousViolations(page)).toEqual([])
      })

      test('the command palette has no serious axe violation', async ({ page }) => {
        await page.getByRole('button', { name: 'Search' }).click()
        await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
        expect(await seriousViolations(page)).toEqual([])
      })

      test('on a phone, the open menu takes the focus, has no serious axe violation, and gives it back', async ({
        page
      }) => {
        await page.setViewportSize({ width: 375, height: 812 })
        const open = page.getByRole('button', { name: 'Open menu' })
        await open.click()
        await expect(page.getByRole('link', { name: 'Customers' })).toBeVisible()
        await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1)
        expect(await seriousViolations(page)).toEqual([])
        await page.keyboard.press('Escape')
        await expect(open).toBeFocused()
      })
    })
  })
}
