import { locales } from '#libs/notifications/locales'
import { dataExportEmails, exportReadyEmail } from './data-export-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

const texts = { en, es, 'pt-BR': ptBR }
const organization = { name: 'Acme <Barbers>', slug: 'acme', timeZone: 'America/Sao_Paulo' }
// 02:30 UTC on the 27th is still the 26th in São Paulo.
const expiresAt = new Date('2026-11-27T02:30:00Z')

describe('data export emails (ADR 0074)', () => {
  it('goes to the owner who asked, in their language, opening the settings, with the day it expires there', () => {
    expect(
      exportReadyEmail({ email: 'ada@example.com', locale: 'en' }, organization, expiresAt, 'https://app.example.com')
    ).toEqual({
      email: 'exportReady',
      to: 'ada@example.com',
      locale: 'en',
      url: 'https://app.example.com/acme/settings/general',
      values: { organization: 'Acme <Barbers>', expires: 'November 26, 2026' }
    })
  })

  it.each(locales)('says in %s that the export is ready, until when, and where', (locale) => {
    const email = dataExportEmails.write(
      exportReadyEmail({ email: 'ada@example.com', locale }, organization, expiresAt, 'https://app.example.com')
    )

    expect(email.subject).toContain('Acme <Barbers>')
    expect(email.text).toContain('2026')
    expect(email.text).toContain('https://app.example.com/acme/settings/general')
    expect(email.html).toContain('Acme &lt;Barbers&gt;')
    expect(email.text).not.toMatch(/\{\w+\}/)
  })

  it('has no empty text in any language', () => {
    for (const text of Object.values(texts).flatMap((language) => Object.values(language).flatMap(Object.values))) {
      expect(text.trim()).not.toBe('')
    }
  })
})
