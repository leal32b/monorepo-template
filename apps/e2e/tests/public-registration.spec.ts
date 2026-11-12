import { OWNER_STATE } from '../support/env'
import { expect, newPerson, test } from '../support/test'

test.use({ storageState: OWNER_STATE })

/** The owner's organization's address, read from where the app opens it. */
async function organizationSlug(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible()
  return new URL(page.url()).pathname.slice(1)
}

test('a visitor registers on an organization’s public page, and a member then sees the customer', async ({
  page,
  browser
}) => {
  const slug = await organizationSlug(page)
  const name = `Vera Visitor ${Date.now().toString(36)}`

  const visitor = await newPerson(browser)
  const refused: string[] = []
  visitor.on('response', (response) => {
    if (response.status() >= 400) refused.push(`${response.status()} ${new URL(response.url()).pathname}`)
  })
  await visitor.goto(`/p/${slug}`)
  await expect(visitor.getByRole('heading', { name: 'Become a customer', level: 1 })).toBeVisible()
  await expect(visitor.getByText('Acme Studio', { exact: true })).toBeVisible()

  await visitor.getByRole('button', { name: 'Send my details' }).click()
  await expect(visitor.getByText('Enter an email or a phone, so they can reach you.')).toBeVisible()
  await visitor.getByLabel('Your name').fill(name)
  await visitor.getByLabel('Phone').fill('+55 11 99999-0000')
  await visitor.getByRole('button', { name: 'Send my details' }).click()

  await expect(visitor.getByRole('status')).toHaveText(
    'Acme Studio received your details. If they need anything else, they will reach you.'
  )
  // A visitor's console shows no refused call: the page never asked for a session (ADR 0042, ADR 0060).
  expect(refused).toEqual([])

  await page.goto(`/${slug}/customers`)
  await expect(page.getByText(name)).toBeVisible()
})

test('an address no organization has says so, with nothing of the app to sign in to', async ({ browser }) => {
  const visitor = await newPerson(browser)

  await visitor.goto('/p/no-such-organization')

  await expect(visitor.getByRole('heading', { name: 'There is no page at this address', level: 1 })).toBeVisible()
  await expect(visitor.getByRole('link')).toHaveCount(0)
})
