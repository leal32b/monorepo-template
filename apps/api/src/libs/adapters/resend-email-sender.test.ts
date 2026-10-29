import { ResendEmailSender } from './resend-email-sender'

const apiKey = 're_test_0123456789'
const options = { apiKey, from: 'Acme <noreply@acme.example>' }
const message = {
  to: 'ada@example.com',
  subject: 'Confirm your email address',
  text: 'Confirm email address: https://app.example.com/confirm?token=abc',
  html: '<p>Confirm</p>'
}

function stubResend(response: () => Response) {
  const fetch = vi.fn(async (_input: string, _init: RequestInit) => response())
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('ResendEmailSender', () => {
  it('posts the message to Resend with the API key', async () => {
    const fetch = stubResend(() => Response.json({ id: 'email-1' }))

    await new ResendEmailSender(options).send(message)

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] ?? []
    const headers = new Headers(init?.headers)
    expect(url).toBe('https://api.resend.com/emails')
    expect(init?.method).toBe('POST')
    expect(headers.get('Authorization')).toBe(`Bearer ${apiKey}`)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ from: options.from, ...message })
  })

  it("throws with Resend's status and error name, never the key or the recipient", async () => {
    stubResend(() =>
      Response.json(
        { statusCode: 403, name: 'validation_error', message: `You can only send to ${message.to}` },
        { status: 403 }
      )
    )

    const sending = new ResendEmailSender(options).send(message)

    await expect(sending).rejects.toThrow('Resend refused the email: 403 validation_error')
    await expect(sending).rejects.not.toThrow(apiKey)
    await expect(sending).rejects.not.toThrow(message.to)
  })

  it('throws with an unknown error name when the body is not JSON', async () => {
    stubResend(() => new Response('Bad gateway', { status: 502 }))

    await expect(new ResendEmailSender(options).send(message)).rejects.toThrow('Resend refused the email: 502 unknown')
  })

  it('gives up when Resend does not answer in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
          })
      )
    )

    await expect(new ResendEmailSender({ ...options, timeoutMs: 10 }).send(message)).rejects.toHaveProperty(
      'name',
      'TimeoutError'
    )
  })
})
