import { OWNER_STATE } from '../support/env'
import { expect, linkInEmail, newPerson, signUp, test, uniqueEmail } from '../support/test'

test.use({ storageState: OWNER_STATE })

test('an owner invites someone, who signs up from the email, joins as a member and cannot manage people', async ({
  page,
  browser
}) => {
  const email = uniqueEmail('invited')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await page.goto(`${new URL(page.url()).pathname}/settings/members`)
  await page.getByRole('button', { name: 'Invite people' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText(`Invitation sent to ${email}`)).toBeVisible()

  const invited = await newPerson(browser)
  await invited.goto(await linkInEmail(email, 'Join'))
  await invited.getByRole('link', { name: 'Create an account' }).click()
  await signUp(invited, 'Ivan Invited', email)
  await invited.getByRole('button', { name: 'Accept invitation' }).click()
  await expect(invited.getByRole('heading', { name: 'Home' })).toBeVisible()

  await invited.goto(`${new URL(invited.url()).pathname}/settings/members`)
  await expect(invited.getByText('Owners and admins manage who is here.')).toBeVisible()
  await expect(invited.getByRole('button', { name: 'Invite people' })).toHaveCount(0)
})
