import pino from 'pino'
import { LogEmailSender } from './log-email-sender'

describe('LogEmailSender', () => {
  it('logs the recipient, the subject and the text with its link, not the HTML', async () => {
    const logger = pino({ level: 'silent' })
    const info = vi.spyOn(logger, 'info')
    const message = {
      to: 'ada@example.com',
      subject: 'Confirm your email address',
      text: 'Confirm email address: https://app.example.com/confirm?token=abc',
      html: '<p>Confirm</p>'
    }

    await new LogEmailSender(logger).send(message)

    expect(info).toHaveBeenCalledExactlyOnceWith(
      { to: message.to, subject: message.subject, text: message.text },
      'email logged, not sent'
    )
  })
})
