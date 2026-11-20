import { gzipSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { OWNER_STATE } from '../support/env'
import { expect, newPerson, test } from '../support/test'

/**
 * The JavaScript a cold load fetches before a screen shows, gzipped, against a budget: the baseline
 * measured on 2026-11-05 plus 5 KB (ADR 0045, docs/testing.md), lowered on 2026-11-12 when the first
 * download became one file, and a tenant's public page's measured then (ADR 0060); raised by 1 KB each on
 * 2026-11-13 for the plan's words in every language (ADR 0068), and the sign-in's and the public page's by
 * 1 KB on 2026-11-18 for the payer's words and the CPF or CNPJ check that `@repo/contracts` brings to the
 * first download (ADR 0069); lowered on 2026-11-18 to the measure plus 1 KB when each screen's texts began to load
 * with its route (ADR 0071); the public page's and the signed-in screen's raised by 1 KB on 2026-11-19, which both sat
 * on exactly, for the links to the terms and privacy notice and the export's route (ADR 0074); all three by 1 KB on
 * 2026-11-20 for the avatar's image and a row's error in `@repo/ui`, and the logo's contract (ADR 0076). Lower a
 * budget when the number drops; raising one is a decision to write down
 * (it checks the choice of `zod/mini`, ADR 0024).
 */
const BUDGET_KB = { signIn: 74, signedIn: 117, publicPage: 78 }

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
