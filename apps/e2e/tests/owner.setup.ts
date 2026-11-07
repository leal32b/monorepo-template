import { OWNER_STATE } from '../support/env'
import { createOrganization, signUp, test, uniqueEmail } from '../support/test'

/** One owner with an organization, signed in, for the specs that start inside the app. */
test('an owner signs up and creates an organization', async ({ page }) => {
  await page.goto('/signup')
  await signUp(page, 'Olivia Owner', uniqueEmail('owner'))
  await createOrganization(page, 'Acme Studio')
  await page.context().storageState({ path: OWNER_STATE })
})
