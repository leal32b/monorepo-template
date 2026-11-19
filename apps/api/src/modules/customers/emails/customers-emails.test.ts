import { locales } from '#libs/notifications/locales'
import { customersEmails } from './customers-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

const texts = { en, es, 'pt-BR': ptBR }
const values = { name: 'Grace <Hopper>', organization: 'Acme Barbers', day: '19 November 2026' }

describe('customers emails (ADR 0073)', () => {
  it.each(locales)('tells the owner in %s who registered through the public page, and when', (locale) => {
    const email = customersEmails.write({
      email: 'customerRegistered',
      to: 'ada@example.com',
      locale,
      url: 'https://app.example.com/acme/customers',
      values
    })

    expect(email.subject).toContain('Grace <Hopper>')
    expect(email.text).toContain('Grace <Hopper>')
    expect(email.text).toContain('Acme Barbers')
    expect(email.text).toContain('19 November 2026')
    expect(email.html).toContain('Grace &lt;Hopper&gt;')
    expect(email.text).not.toMatch(/\{\w+\}/)
  })

  it('has no empty text in any language', () => {
    for (const text of Object.values(texts).flatMap((language) => Object.values(language).flatMap(Object.values))) {
      expect(text.trim()).not.toBe('')
    }
  })
})
