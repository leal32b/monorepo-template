import type { Page } from '@playwright/test'
import { FAKE_BILLING_TOKEN } from '../support/env'
import { createOrganization, expect, signUp, test, uniqueEmail } from '../support/test'

/** The id of the organization at `/:slug`, as the API knows it: what the fake's commands name (ADR 0067). */
async function organizationIdOf(page: Page, slug: string): Promise<string> {
  return page.evaluate(async (wanted) => {
    const organizations = (await (await fetch('/api/auth/organization/list')).json()) as { id: string; slug: string }[]
    return organizations.find((organization) => organization.slug === wanted)?.id as string
  }, slug)
}

/**
 * Tells the billing fake what its provider would have done (ADR 0063): its webhook route returns the notice,
 * and the real path takes over (the event record, the sync job in the API's worker).
 */
async function fake(page: Page, command: string, organizationId: string): Promise<void> {
  const answer = await page.request.post('/api/webhooks/fake', {
    headers: { 'fake-billing-token': FAKE_BILLING_TOKEN },
    data: { command, organizationId }
  })
  expect(answer.status(), `${command} for ${organizationId}`).toBe(200)
}

/** Reads the screen again until `see` holds: the sync job runs right after the notice, a moment later. */
async function untilShown(page: Page, see: () => Promise<void>): Promise<void> {
  await expect(async () => {
    await page.reload()
    await see()
  }).toPass({ timeout: 15_000 })
}

/** A new owner with a new organization on trial; its home and its id. */
async function newOwner(page: Page, name: string, organization: string) {
  await page.goto('/signup')
  await signUp(page, name, uniqueEmail('billing'))
  await createOrganization(page, organization)
  const home = new URL(page.url()).pathname
  return { home, id: await organizationIdOf(page, home.slice(1)) }
}

/**
 * Chooses a plan on the plan page, names whom it charges (ADR 0069), pays on the fake's page (the way back
 * itself), and waits for the provider.
 */
async function subscribe(page: Page, home: string, id: string, plan: 'Basic' | 'Pro', method = 'Card') {
  await page.goto(`${home}/settings/billing`)
  await page.getByRole('button', { name: `Choose ${plan}` }).click()
  await page.getByText(method, { exact: true }).click()
  await page.getByRole('textbox', { name: 'Name or company name' }).fill('Studio Ltda')
  await page.getByRole('textbox', { name: 'CPF or CNPJ' }).fill('11.222.333/0001-81')
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page.getByText('Confirming your payment with the provider…')).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`${home}/settings/billing$`))
  await fake(page, 'checkout.complete', id)
  await expect(page.getByText(`Your payment was confirmed. You are on ${plan}.`)).toBeVisible()
}

test('an organization on trial subscribes, a payment fails, and it recovers, each state said (ADR 0063)', async ({
  page
}) => {
  const { home, id } = await newOwner(page, 'Paula Payer', 'Paula Studio')
  await page.goto(`${home}/settings/billing`)
  const plan = page.getByRole('region', { name: 'Your plan' })
  await expect(plan.getByText(/^Free trial until .+ \(14 days left\)\.$/)).toBeVisible()

  await subscribe(page, home, id, 'Pro', 'Pix')
  await expect(plan.getByText(/^R\$99\.00 a month\. Paid until /)).toBeVisible()
  await expect(plan.getByText('Active', { exact: true })).toBeVisible()

  await fake(page, 'payment.fail', id)
  await page.goto(`${home}/customers`)
  const notice = page
    .getByRole('main')
    .getByText(/^We have not received the payment due on .+\. Pay by .+ to keep editing\./)
  await untilShown(page, () => expect(notice).toBeVisible({ timeout: 1000 }))
  await page.getByRole('main').getByRole('link', { name: 'Pay now' }).click()
  await expect(plan.getByText('Payment late', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible()

  await fake(page, 'payment.recover', id)
  await untilShown(page, () => expect(plan.getByText('Active', { exact: true })).toBeVisible({ timeout: 1000 }))
  await expect(page.getByRole('main').getByText(/We have not received the payment/)).toHaveCount(0)
})

test('an owner on Basic at its limit of customers is told why adding is refused, and what to do', async ({ page }) => {
  const { home, id } = await newOwner(page, 'Lia Limit', 'Lia Studio')
  await subscribe(page, home, id, 'Basic')

  // Ninety-nine customers, as a busy shop would have, through the API.
  await page.evaluate(async (organizationId) => {
    for (let index = 1; index <= 99; index += 1) {
      await fetch(`/api/organizations/${organizationId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Customer ${index}` })
      })
    }
  }, id)
  await page.goto(`${home}/customers`)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Name').fill('Carla Last')
  // Meanwhile, the hundredth arrives from another tab.
  await page.evaluate(
    (organizationId) =>
      fetch(`/api/organizations/${organizationId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Customer 100' })
      }),
    id
  )
  await page.getByRole('button', { name: 'Add customer' }).click()

  const refusal = page.getByRole('alert')
  await expect(refusal).toHaveText(
    /Your plan allows 100 active customers\. Choose a larger plan, or archive customers you no longer serve\./
  )
  await expect(page.getByLabel('Name')).toHaveValue('Carla Last')
  await expect(refusal.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', `${home}/settings/billing`)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
  await expect(
    page.getByText(
      'Your plan allows 100 active customers. Choose a larger plan, or archive customers you no longer serve.'
    )
  ).toBeVisible()
})

test('an organization whose plan ended is read only until its owner pays again', async ({ page }) => {
  const { home, id } = await newOwner(page, 'Rita Reader', 'Rita Studio')
  await subscribe(page, home, id, 'Basic')

  await fake(page, 'subscription.cancel', id)
  await page.goto(`${home}/customers`)
  const notice = page
    .getByRole('main')
    .getByText('Your plan has ended. The organization is read only. Choose a plan to edit again. Nothing was deleted.')
  await untilShown(page, () => expect(notice).toBeVisible({ timeout: 1000 }))
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
  await expect(page.getByText('Read only until the plan is paid')).toBeVisible()

  await page.getByRole('main').getByRole('link', { name: 'See plans' }).click()
  await subscribe(page, home, id, 'Basic')
  await page.goto(`${home}/customers`)
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled()
  await expect(notice).toHaveCount(0)
})
