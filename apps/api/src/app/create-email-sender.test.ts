import pino from 'pino'
import { createEmailSender } from './create-email-sender'

const message = { to: 'ada@example.com', subject: 'Hello', text: 'Hello, Ada.', html: '<p>Hello, Ada.</p>' }

describe('createEmailSender', () => {
  it('logs the message when no provider is configured', async () => {
    const logger = pino({ level: 'silent' })
    const info = vi.spyOn(logger, 'info')

    await createEmailSender({ kind: 'log' }, logger).send(message)

    expect(info).toHaveBeenCalledOnce()
  })

  it('sends through Resend, with the key and the sender, when it is configured', async () => {
    const fetch = vi.fn(async (_input: string, _init: RequestInit) => Response.json({ id: 'email-1' }))
    vi.stubGlobal('fetch', fetch)
    const transport = { kind: 'resend', apiKey: 're_123', from: 'Acme <noreply@acme.example>' } as const

    await createEmailSender(transport, pino({ level: 'silent' })).send(message)

    const init = fetch.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer re_123')
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: transport.from, to: message.to })
  })
})
