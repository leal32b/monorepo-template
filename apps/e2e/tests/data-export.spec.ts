import { readFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import { createOrganization, expect, linkInEmail, signUp, test, uniqueEmail } from '../support/test'

/** The files of a zip by name, read by its central directory, as an unzip tool does. */
function unzip(archive: Buffer): Record<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let at = archive.readUInt32LE(end + 16)
  const files: Record<string, string> = {}
  for (let index = 0; index < archive.readUInt16LE(end + 10); index++) {
    const size = archive.readUInt32LE(at + 20)
    const nameLength = archive.readUInt16LE(at + 28)
    const offset = archive.readUInt32LE(at + 42)
    const data = offset + 30 + archive.readUInt16LE(offset + 26)
    files[archive.subarray(at + 46, at + 46 + nameLength).toString()] = inflateRawSync(
      archive.subarray(data, data + size)
    ).toString()
    at += 46 + nameLength
  }
  return files
}

test('a newcomer reads the terms, signs up, and downloads the organization’s data from the emailed link (ADR 0074)', async ({
  page
}) => {
  const email = uniqueEmail('exporter')
  await page.goto('/signup')
  // The sentence below the button opens the terms in a new tab, so the form keeps what was typed.
  const [terms] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Terms of use (opens in a new tab)' }).click()
  ])
  await expect(terms.getByRole('heading', { name: 'Terms of use', level: 1 })).toBeVisible()
  await terms.close()

  await signUp(page, 'Erin Exporter', email)
  await createOrganization(page, 'Erin Florist')
  await page.getByRole('link', { name: 'Customers' }).first().click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Name').fill('Carmen Customer')
  await page.getByRole('button', { name: 'Add customer' }).click()
  await expect(page.getByText('Carmen Customer was saved.')).toBeVisible()

  const slug = new URL(page.url()).pathname.split('/')[1]
  await page.goto(`/${slug}/settings/general`)
  const data = page.getByRole('region', { name: 'Your data' })
  await data.getByRole('button', { name: 'Export data' }).click()
  await expect(data.getByText(/Being prepared|Ready to download/)).toBeVisible()

  await page.goto(await linkInEmail(email, 'export'))
  const download = page.getByRole('region', { name: 'Your data' }).getByRole('link', { name: 'Download' })
  const [file] = await Promise.all([page.waitForEvent('download'), download.click()])

  expect(file.suggestedFilename()).toMatch(/^organization-export-\d{4}-\d{2}-\d{2}\.zip$/)
  const files = unzip(await readFile(await file.path()))
  expect(Object.keys(files)).toContain('customers.csv')
  expect(files['customers.csv']).toContain('Carmen Customer')
  expect(files['members.csv']).toContain(email)
  expect(files['organization.csv']).toContain('Erin Florist')
})
