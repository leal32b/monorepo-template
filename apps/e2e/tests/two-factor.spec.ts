import { expect, PASSWORD, signUp, test, uniqueEmail } from '../support/test'
import { totp } from '../support/totp'

test('someone turns on two-step verification, then signs in with a code from the app', async ({ page }) => {
  const email = uniqueEmail('careful')
  await page.goto('/signup')
  await signUp(page, 'Cora Careful', email)
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()

  await page.goto('/settings/security')
  await page.getByRole('button', { name: 'Turn on' }).click()
  await page.getByLabel('Your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Set up' }).click()
  const uri = await page.getByRole('link', { name: 'Open it in your authenticator app' }).getAttribute('href')
  const secret = new URL(uri ?? '').searchParams.get('secret') ?? ''
  await page.getByLabel('6-digit code').fill(totp(secret))
  await page.getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByRole('list', { name: 'Backup codes' })).toBeVisible()
  await page.getByRole('button', { name: 'I saved them' }).click()
  await expect(
    page.getByText('Done: signing in with your password now also asks for a code from your app.')
  ).toBeVisible()
  await page.context().clearCookies()

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Two-step verification' })).toBeVisible()
  await page.getByLabel('6-digit code').fill(totp(secret))
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()
})
