import { OWNER_STATE } from '../support/env'
import { expect, test } from '../support/test'

test.use({ storageState: OWNER_STATE })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible()
})

test('the organization’s settings open from its name, and lead back to the screen the user came from (ADR 0080)', async ({
  page
}) => {
  const home = new URL(page.url()).pathname
  const menu = page.getByRole('complementary')
  await menu.getByRole('link', { name: 'Customers' }).click()
  await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible()

  await menu.getByRole('button', { name: /Acme Studio/ }).click()
  await page.getByRole('menuitem', { name: 'Organization settings' }).click()

  await expect(page.getByRole('heading', { name: 'General', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(`${home}/settings/general`)
  await menu.getByRole('link', { name: 'Back to Customers' }).click()
  await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible()
})

test('on a phone, You lists the person’s settings, each of which leads back to it (ADR 0080)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'You' }).click()
  await expect(page.getByRole('heading', { name: 'You', level: 1 })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Security' }).click()
  await expect(page.getByRole('heading', { name: 'Security', level: 1 })).toBeVisible()

  await page.getByRole('main').getByRole('link', { name: 'You' }).click()
  await expect(page.getByRole('heading', { name: 'You', level: 1 })).toBeVisible()
})
