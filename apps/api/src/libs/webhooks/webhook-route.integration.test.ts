import type { AddressInfo } from 'node:net'
import { apiProblemSchema, webhookReceiptSchema } from '@repo/contracts'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { WebhookInbox } from '#libs/ports/webhook-inbox.port'
import { type WebhookNotice, type WebhookReader, WebhookRefused } from '#libs/ports/webhook-reader.port'
import { webhookRoute } from './webhook-route'

const secret = 'provider-token-0123456789'

/** A provider whose notices carry a token, as Asaas's do (ADR 0064): JSON with an id, or a kind not used. */
const reader: WebhookReader<WebhookNotice> = {
  name: 'acme',
  async readWebhook(rawBody, headers) {
    if (headers['acme-token'] !== secret) throw new WebhookRefused('token does not match')
    const body = JSON.parse(rawBody.toString('utf8')) as { id: string; kind: string }
    return body.kind === 'unused' ? 'ignored' : { eventId: body.id }
  }
}

/** The inbox, in memory: the events it took in, so a test sees whether anything reached it. */
function memoryInbox(): WebhookInbox<WebhookNotice> & { received: string[] } {
  const received: string[] = []
  return {
    received,
    async receive(source, notice) {
      const key = `${source}:${notice.eventId}`
      if (received.includes(key)) return false
      received.push(key)
      return true
    }
  }
}

async function serve(inbox = memoryInbox()) {
  const { logger, lines } = memoryLogger()
  const router = new HttpRouter()
  router.post('/api/webhooks/acme', webhookRoute(reader, inbox, logger))
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const deliver = (body: string, headers: Record<string, string> = { 'acme-token': secret }) =>
    fetch(`${origin}/api/webhooks/acme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body
    })
  return { inbox, lines, deliver, origin }
}

describe('webhookRoute (ADR 0063)', () => {
  it('takes an authenticated notice in and answers with the receipt', async () => {
    const { inbox, deliver, lines } = await serve()

    const response = await deliver('{"id":"evt_1","kind":"paid"}')

    expect(response.status).toBe(200)
    expect(webhookReceiptSchema.parse(await response.json())).toEqual({ received: true })
    expect(inbox.received).toEqual(['acme:evt_1'])
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'webhook received', provider: 'acme', eventId: 'evt_1', repeat: false })
    )
  })

  it('answers a repeat the same, without taking it in twice', async () => {
    const { inbox, deliver, lines } = await serve()
    await deliver('{"id":"evt_1","kind":"paid"}')

    const repeat = await deliver('{"id":"evt_1","kind":"paid"}')

    expect(repeat.status).toBe(200)
    expect(inbox.received).toEqual(['acme:evt_1'])
    expect(lines).toContainEqual(expect.objectContaining({ msg: 'webhook received', repeat: true }))
  })

  it('answers a kind of notice the template does not use the same, taking nothing in', async () => {
    const { inbox, deliver } = await serve()

    expect((await deliver('{"id":"evt_2","kind":"unused"}')).status).toBe(200)
    expect(inbox.received).toEqual([])
  })

  it('refuses a forged or missing token with a 401, before the body is parsed or anything stored', async () => {
    const receive = vi.fn()
    const { deliver, lines } = await serve({ received: [], receive })

    const forged = await deliver('not even json', { 'acme-token': 'guess' })
    const missing = await deliver('{"id":"evt_3","kind":"paid"}', {})

    expect(forged.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(apiProblemSchema.parse(await forged.json()).code).toBe('webhook_unauthenticated')
    expect(receive).not.toHaveBeenCalled()
    expect(lines).toContainEqual(
      expect.objectContaining({ level: 40, msg: 'webhook refused', provider: 'acme', reason: 'token does not match' })
    )
    expect(JSON.stringify(lines)).not.toContain('not even json')
  })

  it('answers 503 when the inbox cannot reach the database, so the provider tries again', async () => {
    const down = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    const { logger } = memoryLogger()
    const router = new HttpRouter()
    router.post('/api/webhooks/acme', webhookRoute(reader, { receive: async () => Promise.reject(down) }, logger))
    const server = createHttpServer({ router, logger, isUnavailable: (error) => error === down })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))

    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/webhooks/acme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'acme-token': secret },
      body: '{"id":"evt_4","kind":"paid"}'
    })

    expect(response.status).toBe(503)
  })

  it('lets any other failure of the reader through as an error of ours', async () => {
    const { deliver } = await serve()

    expect((await deliver('{broken', { 'acme-token': secret })).status).toBe(500)
  })

  it('answers 404 for a provider that is not configured: only its own path exists', async () => {
    const { origin } = await serve()

    const response = await fetch(`${origin}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })

    expect(response.status).toBe(404)
  })
})
