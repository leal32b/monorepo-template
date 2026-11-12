import { createOrganization, expect, signUp, test, uniqueEmail } from '../support/test'

test('a member changes a customer, and the activity says who did what (ADR 0061)', async ({ page }) => {
  await page.goto('/signup')
  await signUp(page, 'Olga Owner', uniqueEmail('activity'))
  await createOrganization(page, 'Olga Studio')
  const home = new URL(page.url()).pathname

  await page.goto(`${home}/customers`)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Name').fill('Carla Client')
  await page.getByRole('button', { name: 'Add customer' }).click()
  await expect(page.getByText('Carla Client was saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Email').fill('carla@example.test')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Carla Client was saved.')).toBeVisible()

  await page.goto(`${home}/settings/activity`)
  const changes = page.getByRole('region', { name: 'Recent changes' })
  await expect(changes.getByText(/^Edited a customer: email · /)).toBeVisible()
  await expect(changes.getByText(/^Added a customer: name · /)).toBeVisible()
  await expect(changes.getByText('Olga Owner')).toHaveCount(2)
})
