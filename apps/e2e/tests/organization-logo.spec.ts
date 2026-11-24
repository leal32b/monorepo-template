import { crc32, deflateSync } from 'node:zlib'
import type { Page } from '@playwright/test'
import { createOrganization, expect, signUp, test, uniqueEmail } from '../support/test'

/** A real PNG of one colour, `side` pixels square, that a browser decodes: what a person would upload. */
function png(side: number, [red, green, blue]: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const check = Buffer.alloc(4)
    check.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, check])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(side, 0)
  header.writeUInt32BE(side, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8 bits per channel, RGB, no interlace
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: side }, () => [red, green, blue]).flat())
  ])
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: side }, () => row)))),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/** Chooses a file from the row's button, through the device's picker, as a person does. */
async function choose(page: Page, button: string, file: { name: string; mimeType: string; buffer: Buffer }) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: button }).click()
  ])
  await chooser.setFiles(file)
}

test('an owner uploads the organization’s logo, which the side menu shows, then replaces it (ADR 0076)', async ({
  page
}) => {
  await page.goto('/signup')
  await signUp(page, 'Lia Logos', uniqueEmail('logo'))
  await createOrganization(page, 'Lia Florist')
  const home = new URL(page.url()).pathname
  const general = `${home}/settings/general`
  const details = page.getByRole('region', { name: 'Organization' })
  /** The organization's mark in the side menu's switcher, on the organization's screens. */
  const mark = () =>
    page
      .getByRole('button', { name: /Lia Florist/ })
      .first()
      .locator('img')
  await page.goto(general)

  // A file of another type is refused at once, before anything is sent.
  await choose(page, 'Upload logo', { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(details.getByText('Use a PNG, JPEG or WebP image.')).toBeVisible()

  await choose(page, 'Upload logo', { name: 'logo.png', mimeType: 'image/png', buffer: png(64, [200, 30, 60]) })
  await expect(details.getByText('Logo saved')).toBeVisible()
  await expect(details.getByRole('button', { name: 'Replace' })).toBeVisible()
  await page.goto(home)
  await expect(mark()).toHaveClass(/opacity-100/)
  const first = await mark().getAttribute('src')

  await page.goto(general)
  await choose(page, 'Replace', { name: 'new-logo.png', mimeType: 'image/png', buffer: png(128, [20, 90, 200]) })
  await expect(details.getByText('Logo replaced')).toBeVisible()
  await page.goto(home)
  await expect(mark()).toHaveClass(/opacity-100/)
  expect(await mark().getAttribute('src')).not.toBe(first)
})
