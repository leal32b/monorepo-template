import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { DB_PORT, WEB_ORIGIN } from '../support/env'
import { createOrganization, expect, newPerson, PASSWORD, signUp, test, uniqueEmail } from '../support/test'
import { totp } from '../support/totp'

/**
 * The operator back office (ADR 0077). An operator is made only by the `operator` command, run with the
 * database's credentials: here, against the suite's database.
 */
function grantOperator(email: string): void {
  execFileSync('pnpm', ['run', '--silent', 'operator', 'grant', email, '--by', 'e2e'], {
    cwd: path.resolve(import.meta.dirname, '../../api'),
    env: {
      ...process.env,
      DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
      LOG_LEVEL: 'warn'
    },
    stdio: 'pipe'
  })
}

/** Turns on two-step verification from the security screen, and returns the key the authenticator keeps. */
async function turnOnTwoFactor(page: Page): Promise<string> {
  await page.goto('/settings/security')
  await page.getByRole('button', { name: 'Turn on' }).click()
  await page.getByLabel('Your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Set up' }).click()
  const uri = await page.getByRole('link', { name: 'Open it in your authenticator app' }).getAttribute('href')
  const secret = new URL(uri ?? '').searchParams.get('secret') ?? ''
  await page.getByLabel('6-digit code').fill(totp(secret))
  await page.getByRole('button', { name: 'Turn on' }).click()
  await page.getByRole('button', { name: 'I saved them' }).click()
  return secret
}

/** Every route of the back office, as any caller can send it. */
const backOfficeRoutes = (organizationId: string) =>
  [
    ['GET', '/api/admin/organizations'],
    ['GET', `/api/admin/organizations/${organizationId}`],
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/impersonation'],
    ['POST', `/api/admin/organizations/${organizationId}/impersonation`],
    ['DELETE', '/api/admin/impersonation']
  ] as const

test('an operator finds an organization and enters it as its owner, and the owner’s activity shows it', async ({
  page,
  browser
}) => {
  // The owner, with an organization of their own.
  const owner = await newPerson(browser)
  const bakery = `Visited Bakery ${Date.now().toString(36)}`
  await owner.goto('/signup')
  await signUp(owner, 'Odette Owner', uniqueEmail('visited'))
  await createOrganization(owner, bakery)
  const home = new URL(owner.url()).pathname

  // The operator: an account with two-step verification, made an operator, signed in again with the code.
  const email = uniqueEmail('operator')
  await page.goto('/signup')
  await signUp(page, 'Otto Operator', email)
  await expect(page.getByRole('heading', { name: 'Name your organization' })).toBeVisible()
  const secret = await turnOnTwoFactor(page)
  grantOperator(email)
  await page.context().clearCookies()
  await page.goto('/login?next=%2Fadmin')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByLabel('6-digit code').fill(totp(secret))
  await page.getByRole('button', { name: 'Verify' }).click()

  // Finds the organization, opens it, enters it.
  await expect(page.getByRole('heading', { level: 1, name: 'Organizations' })).toBeVisible()
  await page.getByLabel('Find by name, address or owner’s email').fill(bakery)
  await page.getByRole('button', { name: 'Find' }).click()
  await page.getByRole('link', { name: `Open: ${bakery}` }).click()
  await expect(page.getByText('Odette Owner', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enter' }).click()

  // Inside, as the owner sees it, read only, under the banner.
  await expect(page).toHaveURL(new RegExp(`${home}$`))
  await expect(page.getByText(`You are viewing ${bakery} as its owner sees it`)).toBeVisible()
  await page.goto(`${home}/customers`)
  await expect(page.getByText(/You can see them, not change them\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Leave' }).click()
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()

  // The owner's activity names the operator, entering and leaving.
  await owner.goto(`${home}/settings/activity`)
  const changes = owner.getByRole('region', { name: 'Recent changes' })
  await expect(changes.getByText(/^Entered to see the organization as its owner, read only · /)).toBeVisible()
  await expect(changes.getByText(/^Left the organization · /)).toBeVisible()
  await expect(changes.getByText('Otto Operator, an operator of the service')).toHaveCount(2)
})

test('whoever is not an operator gets 404 on every back office route, and "not found" at /admin', async ({
  page,
  browser
}) => {
  await page.goto('/signup')
  await signUp(page, 'Nora Nobody', uniqueEmail('nobody'))
  await createOrganization(page, 'Nora Studio')
  const organizationId = await page.evaluate(async () => {
    const organizations = (await (await fetch('/api/auth/organization/list')).json()) as { id: string }[]
    return organizations[0]?.id as string
  })

  // Signed in, and as a visitor with no session.
  const visitor = await newPerson(browser)
  for (const caller of [page, visitor]) {
    for (const [method, route] of backOfficeRoutes(organizationId)) {
      const response = await caller.request.fetch(route, { method, headers: { Origin: WEB_ORIGIN } })
      expect({ route, method, status: response.status(), code: (await response.json()).code }).toEqual({
        route,
        method,
        status: 404,
        code: 'not_found'
      })
    }
  }

  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
})
