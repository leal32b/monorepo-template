import pino from 'pino'
import { LogShortMessageSender } from './log-short-message-sender'

describe('LogShortMessageSender', () => {
  it('logs the number and the text instead of sending them, for development', async () => {
    const logger = pino({ level: 'silent' })
    const info = vi.spyOn(logger, 'info')

    await new LogShortMessageSender(logger).send({ to: '+5511912345678', text: 'Your code is 123456.' })

    expect(info).toHaveBeenCalledExactlyOnceWith(
      { to: '+5511912345678', text: 'Your code is 123456.' },
      'short message logged, not sent'
    )
  })
})
