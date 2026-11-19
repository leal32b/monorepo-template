import { writeEmail } from './write-email'

const to = 'ada@example.com'
const url = 'https://app.example.com/api/auth/verify-email?token=abc&callbackURL=%2F'
const text = {
  subject: 'Join {organization}',
  body: '{inviter} invited you to join {organization}.',
  action: 'Open the invitation',
  footer: 'The invitation expires in 7 days.'
}

describe('writeEmail', () => {
  it('writes a paragraph, its link and a footer, in the text and in the HTML of the language', () => {
    const email = writeEmail(text, { to, locale: 'pt-BR', url })

    expect(email).toMatchObject({ to, subject: 'Join {organization}' })
    expect(email.text).toBe(
      '{inviter} invited you to join {organization}.\n\nOpen the invitation: ' +
        `${url}\n\nThe invitation expires in 7 days.\n`
    )
    expect(email.html).toContain('<html lang="pt-BR">')
    expect(email.html).toContain(`<a href="${url.replaceAll('&', '&amp;')}">Open the invitation</a>`)
  })

  it('escapes the link in the HTML', () => {
    const email = writeEmail(text, { to, locale: 'en', url: 'https://app.example.com/?a=1&b="><script>' })

    expect(email.html).toContain('href="https://app.example.com/?a=1&amp;b=&quot;&gt;&lt;script&gt;"')
    expect(email.html).not.toContain('<script>')
  })

  it('fills the tokens of the subject and the body, escaped in the HTML', () => {
    const values = { organization: 'Acme <Labs>', inviter: 'Ada (ada@example.com)' }

    const email = writeEmail(text, { to, locale: 'en', url, values })

    expect(email.subject).toBe('Join Acme <Labs>')
    expect(email.text).toContain('Ada (ada@example.com) invited you to join Acme <Labs>.')
    expect(email.html).toContain('Ada (ada@example.com) invited you to join Acme &lt;Labs&gt;.')
  })

  it('leaves a token without a value as written', () => {
    expect(writeEmail(text, { to, locale: 'en', url, values: { inviter: 'Ada' } }).subject).toBe('Join {organization}')
  })
})
