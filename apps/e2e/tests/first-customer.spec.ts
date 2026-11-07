import { createOrganization, expect, signUp, test, uniqueEmail } from '../support/test'

test('a newcomer signs up, confirms the email, creates an organization and adds a customer', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('link', { name: 'Create an account' }).click()

  await signUp(page, 'Nina Newcomer', uniqueEmail('newcomer'))
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()
  await createOrganization(page, 'Nina Bakery')

  await page.getByRole('link', { name: 'Customers' }).first().click()
  await expect(page.getByText('No customers yet')).toBeVisible()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Name').fill('Carlos Customer')
  await page.getByLabel('Email').fill('carlos@example.test')
  await page.getByRole('button', { name: 'Add customer' }).click()

  await expect(page.getByText('Carlos Customer was saved.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Carlos Customer')).toBeVisible()
})
