import { locales } from '#libs/notifications/locales'
import { writeEmail } from '#libs/notifications/write-email'
import { identityEmails } from './identity-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

const emailTexts = { en, es, 'pt-BR': ptBR }
const kinds = Object.keys(en) as (keyof typeof en)[]
const to = 'ada@example.com'
const url = 'https://app.example.com/api/auth/verify-email?token=abc&callbackURL=%2F'

describe('identity emails', () => {
  describe.each(locales)('in %s', (locale) => {
    it.each(kinds)('writes %s with its link in the text and in the HTML', (kind) => {
      const texts = emailTexts[locale][kind]

      const email = identityEmails.write({ email: kind, to, locale, url })

      expect(email).toMatchObject({ to, subject: texts.subject })
      expect(email.text).toBe(`${texts.body}\n\n${texts.action}: ${url}\n\n${texts.footer}\n`)
      expect(email.html).toContain(`<html lang="${locale}">`)
      expect(email.html).toContain(`<a href="${url.replaceAll('&', '&amp;')}">`)
    })
  })

  it('names the organization and the inviter in an invitation', () => {
    const values = { organization: 'Acme', inviter: 'Ada (ada@example.com)' }

    const email = identityEmails.write({ email: 'invitation', to, locale: 'en', url, values })

    expect(email).toEqual(writeEmail(en.invitation, { to, locale: 'en', url, values }))
    expect(email.subject).toBe('Join Acme')
    expect(email.text).toContain('Ada (ada@example.com) invited you to join Acme.')
  })

  it('has no empty text in any language', () => {
    const texts = Object.values(emailTexts).flatMap((language) => Object.values(language).flatMap(Object.values))

    for (const text of texts) expect(text.trim()).not.toBe('')
  })
})
