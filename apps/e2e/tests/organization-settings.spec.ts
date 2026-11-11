import { OWNER_STATE } from '../support/env'
import { expect, test } from '../support/test'

test.use({ storageState: OWNER_STATE })

test('an owner changes the organization’s time zone and currency, which stay after a reload (ADR 0053)', async ({
  page
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await page.goto(`${new URL(page.url()).pathname}/settings/general`)
  const settings = page.getByRole('region', { name: 'Time and money' })

  await settings.getByRole('button', { name: 'Change time zone' }).click()
  await page.getByLabel('Time zone').selectOption('Europe/Lisbon')
  await page.getByRole('button', { name: 'Save time zone' }).click()
  await expect(settings.getByText('Time zone saved')).toBeVisible()

  await settings.getByRole('button', { name: 'Change currency' }).click()
  await page.getByLabel('Currency').selectOption('EUR')
  await page.getByRole('button', { name: 'Save currency' }).click()
  await expect(settings.getByText('Currency saved')).toBeVisible()

  await page.reload()
  await expect(settings.getByText(/^Europe\/Lisbon · now /)).toBeVisible()
  await expect(settings.getByText(/^Euro \(EUR\) · €1,234\.56$/)).toBeVisible()
})
