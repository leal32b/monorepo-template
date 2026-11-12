import { gzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { OWNER_STATE } from '../support/env'
import { expect, newPerson, test } from '../support/test'

/**
 * The JavaScript a cold load fetches before a screen shows, gzipped, against a budget: the baseline
 * measured on 2026-11-05 plus 5 KB (ADR 0045, docs/testing.md), lowered on 2026-11-12 when the first
 * download became one file, and a tenant's public page's measured then (ADR 0060). Lower a budget when the number drops;
 * raising one is a decision to write down (it checks the choice of `zod/mini`, ADR 0024).
 */
const BUDGET_KB = { signIn: 77, signedIn: 117, publicPage: 81 }

/** Starts collecting every script the page fetches; the result is their gzipped size in KB. */
function countScripts(page: Page): () => Promise<number> {
  const sizes: Promise<number>[] = []
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') {
      sizes.push(response.body().then((body) => gzipSync(body).length))
    }
  })
  return async () => Math.round((await Promise.all(sizes)).reduce((sum, size) => sum + size, 0) / 1024)
}

test('a cold load of the sign-in screen stays within its JavaScript budget', async ({ page }) => {
  const kilobytes = countScripts(page)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const size = await kilobytes()
  test.info().annotations.push({ type: 'JS gzip', description: `${size} KB` })
  expect(size).toBeLessThanOrEqual(BUDGET_KB.signIn)
})

test.describe('signed in', () => {
  test.use({ storageState: OWNER_STATE })

  test('a cold load of a tenant’s public page stays within its JavaScript budget (ADR 0060)', async ({
    page,
    browser
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible()
    const slug = new URL(page.url()).pathname.slice(1)
    const visitor = await newPerson(browser)
    const kilobytes = countScripts(visitor)
    await visitor.goto(`/p/${slug}`)
    await expect(visitor.getByRole('heading', { name: 'Become a customer', level: 1 })).toBeVisible()
    await visitor.waitForLoadState('networkidle')
    const size = await kilobytes()
    test.info().annotations.push({ type: 'JS gzip', description: `${size} KB` })
    expect(size).toBeLessThanOrEqual(BUDGET_KB.publicPage)
  })

  test('a cold load of the first signed-in screen stays within its JavaScript budget', async ({ page }) => {
    const kilobytes = countScripts(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    const size = await kilobytes()
    test.info().annotations.push({ type: 'JS gzip', description: `${size} KB` })
    expect(size).toBeLessThanOrEqual(BUDGET_KB.signedIn)
  })
})
