import pino from 'pino'
import { LogEmailSender } from './log-email-sender'

describe('LogEmailSender', () => {
  it('logs the recipient, the subject and the text with its link, not the HTML, one line each so the link opens', async () => {
    const logger = pino({ level: 'silent' })
    const info = vi.spyOn(logger, 'info')
    const message = {
      to: 'ada@example.com',
      subject: 'Confirm your email address',
      text: 'Confirm your address.\n\nConfirm email address: https://app.example.com/confirm?token=abc\n\nIt expires in 1 hour.\n',
      html: '<p>Confirm</p>'
    }

    await new LogEmailSender(logger).send(message)

    expect(info).toHaveBeenCalledExactlyOnceWith(
      {
        to: message.to,
        subject: message.subject,
        text: [
          'Confirm your address.',
          'Confirm email address: https://app.example.com/confirm?token=abc',
          'It expires in 1 hour.'
        ]
      },
      'email logged, not sent'
    )
  })
})
