import { readFile } from 'node:fs/promises'
import { AxeBuilder } from '@axe-core/playwright'
import { type Browser, test as base, expect, type Page } from '@playwright/test'

export { expect }

let clients = 0

/**
 * A client address of its own, as separate people have, so the rate limit (3 sign-ins per 10 s per
 * address) counts each browser apart (ADR 0045).
 */
function clientAddress(): { 'X-Client-IP': string } {
  clients += 1
  return { 'X-Client-IP': `10.${base.info().workerIndex % 256}.${clients >> 8}.${clients % 256}` }
}

/** Every test's page is its own client. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.setExtraHTTPHeaders(clientAddress())
    await use(page)
  }
})

/**
 * A second person in the same test: a browser with no session (a new context would otherwise take
 * the test's `storageState`) and a client address of its own.
 */
export async function newPerson(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: clientAddress()
  })
  return context.newPage()
}

/** A fresh address for one test, so tests never share an account. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

/** A password long enough for the rules; the breach check answers offline. */
export const PASSWORD = 'correct-horse-battery-staple-9'

type Email = { to: string; subject: string; text: string }

/** The link in the latest email sent to `to` whose subject contains `subject`. */
export async function linkInEmail(to: string, subject: string): Promise<string> {
  const outbox = process.env.E2E_OUTBOX
  if (!outbox) throw new Error('E2E_OUTBOX is set by playwright.config.ts')
  let link: string | undefined
  await expect
    .poll(async () => {
      const lines = (await readFile(outbox, 'utf8').catch(() => '')).split('\n').filter(Boolean)
      const email = lines
        .map((line) => JSON.parse(line) as Email)
        .findLast((message) => message.to === to && message.subject.includes(subject))
      link = email?.text.match(/https?:\/\/\S+/)?.[0]
      return link
    }, `an email "${subject}" to ${to}`)
    .toBeDefined()
  return link as string
}

/** Fills the sign-up form, then opens the confirmation link: the account is signed in after it. */
export async function signUp(page: Page, name: string, email: string): Promise<void> {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await page.goto(await linkInEmail(email, 'Confirm'))
}

/** From the onboarding screen: names a new organization and waits for its home. */
export async function createOrganization(page: Page, name: string): Promise<void> {
  await page.getByLabel('Organization name').fill(name)
  await page.getByRole('button', { name: 'Create organization' }).click()
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
}

/** Accessibility violations of serious or critical impact (axe-core: WCAG 2.2 AA and best practice). */
export async function seriousViolations(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' '))
    }))
}
