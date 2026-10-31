import { type EmailKind, emailTexts, type Locale } from './email-texts'
import { writeEmail } from './write-email'

const locales = Object.keys(emailTexts) as Locale[]
const kinds = Object.keys(emailTexts.en) as EmailKind[]
const to = 'ada@example.com'
const url = 'https://app.example.com/api/auth/verify-email?token=abc&callbackURL=%2F'

describe('writeEmail', () => {
  describe.each(locales)('in %s', (locale) => {
    it.each(kinds)('writes %s with its link in the text and in the HTML', (kind) => {
      const texts = emailTexts[locale][kind]

      const email = writeEmail(kind, { to, locale, url })

      expect(email).toMatchObject({ to, subject: texts.subject })
      expect(email.text).toBe(`${texts.body}\n\n${texts.action}: ${url}\n\n${texts.footer}\n`)
      expect(email.html).toContain(`<html lang="${locale}">`)
      expect(email.html).toContain(`<a href="${url.replaceAll('&', '&amp;')}">`)
    })
  })

  it('escapes the link in the HTML', () => {
    const email = writeEmail('resetPassword', { to, locale: 'en', url: 'https://app.example.com/?a=1&b="><script>' })

    expect(email.html).toContain('href="https://app.example.com/?a=1&amp;b=&quot;&gt;&lt;script&gt;"')
    expect(email.html).not.toContain('<script>')
  })

  it('has no empty text in any language', () => {
    const texts = Object.values(emailTexts).flatMap((language) => Object.values(language).flatMap(Object.values))

    for (const text of texts) expect(text.trim()).not.toBe('')
  })
})
