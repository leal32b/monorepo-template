import { locales } from '#libs/notifications/locales'
import type { OrganizationOwners } from '#modules/identity/index'
import { billingEmails, paymentFailedEmail, trialEndingEmail } from './billing-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

type Owner = NonNullable<Awaited<ReturnType<OrganizationOwners['ownerOf']>>>

const texts = { en, es, 'pt-BR': ptBR }
const owner: Owner = {
  email: 'ada@example.com',
  locale: 'es',
  organization: { name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo' }
}
const webOrigin = 'https://app.example.com'

describe('billing emails (ADR 0073)', () => {
  it('tells the owner when the trial ends, in their language and on the organization’s calendar', () => {
    expect(trialEndingEmail(owner, new Date('2026-12-06T01:00:00.000Z'), webOrigin)).toEqual({
      email: 'trialEnding',
      to: 'ada@example.com',
      locale: 'es',
      url: 'https://app.example.com/acme/settings/billing',
      values: { organization: 'Acme Barbers', days: '3', trialEnds: '5 de diciembre de 2026' }
    })
  })

  it('tells the owner which payment is late and until when to pay to keep editing', () => {
    expect(paymentFailedEmail(owner, new Date('2026-11-03T12:00:00.000Z'), webOrigin)).toEqual({
      email: 'paymentFailed',
      to: 'ada@example.com',
      locale: 'es',
      url: 'https://app.example.com/acme/settings/billing',
      values: { organization: 'Acme Barbers', dueDay: '3 de noviembre de 2026', payBy: '17 de noviembre de 2026' }
    })
  })

  it('writes nothing for a late payment whose due date the provider did not give', () => {
    expect(paymentFailedEmail(owner, null, webOrigin)).toBeNull()
  })

  it.each(locales)('fills every token of both messages in %s', (locale) => {
    const trial = trialEndingEmail({ ...owner, locale }, new Date('2026-12-05T12:00:00.000Z'), webOrigin)
    const late = paymentFailedEmail({ ...owner, locale }, new Date('2026-11-03T12:00:00.000Z'), webOrigin)

    for (const payload of [trial, late]) {
      const email = billingEmails.write(payload as NonNullable<typeof late>)
      expect(`${email.subject}\n${email.text}`).not.toMatch(/\{\w+\}/)
      expect(email.text).toContain('Acme Barbers')
    }
  })

  it('has no empty text in any language', () => {
    for (const text of Object.values(texts).flatMap((language) => Object.values(language).flatMap(Object.values))) {
      expect(text.trim()).not.toBe('')
    }
  })
})
