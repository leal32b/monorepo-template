import { expect, test } from '../support/test'

/**
 * The headers of `apps/web/public/_headers`, as `vite preview` serves them from the same file the
 * deploy publishes (the deploy smoke test checks them again on Cloudflare).
 */
test('the page carries the security headers', async ({ page }) => {
  const response = await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()

  const headers = response?.headers() ?? {}
  expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains')
  expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['permissions-policy']).toContain('clipboard-write=(self)')
})
