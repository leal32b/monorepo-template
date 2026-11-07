import { expect, linkInEmail, signUp, test, uniqueEmail } from '../support/test'

test('someone who forgot the password resets it from the email and signs in with the new one', async ({ page }) => {
  const email = uniqueEmail('forgetful')
  const newPassword = 'a-brand-new-passphrase-42'
  await page.goto('/signup')
  await signUp(page, 'Fred Forgetful', email)
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()
  await page.context().clearCookies()

  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot your password?' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send link' }).click()
  await expect(page.getByText(`If an account uses ${email}, we sent it a link.`, { exact: false })).toBeVisible()

  await page.goto(await linkInEmail(email, 'Reset your password'))
  await page.getByLabel('New password').fill(newPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible()

  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()
})
