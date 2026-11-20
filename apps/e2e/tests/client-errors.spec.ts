import { expect, test } from '../support/test'

/**
 * A browser error reaches the API's log (ADR 0072). The log is the API process's stdout, which the suite does not
 * read; what only the built app can show is the path: the page's CSP lets the beacon out, the preview proxy and
 * the origin check let it in, and the route answers 204.
 */
test('an error nobody handled is reported to the API from the built app', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()

  const answered = page.waitForResponse((response) => response.url().endsWith('/api/client-errors'))
  await page.evaluate(() => {
    void Promise.reject(new Error('e2e: a promise nobody caught'))
  })

  // Playwright cannot read a beacon's body: what the report holds is proven by the unit tests.
  const response = await answered
  expect(response.request().method()).toBe('POST')
  expect(response.status()).toBe(204)
})
