import { createOrganization, expect, linkInEmail, PASSWORD, signUp, test, uniqueEmail } from '../support/test'

test('someone deletes their account from the profile, confirms from the email, and can no longer sign in', async ({
  page
}) => {
  const email = uniqueEmail('leaving')
  await page.goto('/signup')
  await signUp(page, 'Lena Leaving', email)
  await createOrganization(page, 'Lena Lamps')

  await page.goto('/settings/profile')
  await page.getByRole('button', { name: 'Delete account' }).click()
  await expect(page.getByText('go too, with everything in them: Lena Lamps.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Email me the link' }).click()
  await expect(page.getByText(`We sent a link to ${email}.`, { exact: false })).toBeVisible()

  await page.goto(await linkInEmail(email, 'Confirm deleting your account'))
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await expect(page.getByText('Your account was deleted.')).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('The email or password is wrong.', { exact: false })).toBeVisible()
})
