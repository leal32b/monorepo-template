import type { AddressInfo } from 'node:net'
import pino from 'pino'
import { BODY_LIMIT_BYTES } from './body'
import { fromFetchHandler } from './fetch-handler'
import { HttpRouter } from './router'
import { createHttpServer } from './server'

const origin = 'https://app.example.com'
const closers: Array<() => Promise<void>> = []

/** Serves `handle` at `/auth/*` through the real pipeline, as the composition root will. */
async function serve(handle: (request: Request) => Promise<Response>) {
  const router = new HttpRouter()
  const handler = fromFetchHandler(handle, origin)
  router.get('/auth/*', handler)
  router.post('/auth/*', handler)
  const server = createHttpServer({ router, logger: pino({ level: 'silent' }) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

/** Answers with what it was given. */
const echo = async (request: Request) =>
  Response.json({
    method: request.method,
    url: request.url,
    cookie: request.headers.get('cookie'),
    clientIp: request.headers.get('x-client-ip'),
    body: request.body === null ? null : await request.text()
  })

const postJson = (body: NonNullable<RequestInit['body']>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
  duplex: 'half' as const
})

describe('fromFetchHandler', () => {
  it('passes the method, the URL on the given origin, the headers and the body', async () => {
    const url = await serve(echo)

    const response = await fetch(`${url}/auth/sign-in?next=%2F`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: 'session=abc', 'X-Client-IP': '203.0.113.7' },
      body: '{"email":"ada@example.com"}'
    })

    expect(await response.json()).toEqual({
      method: 'POST',
      url: 'https://app.example.com/auth/sign-in?next=%2F',
      cookie: 'session=abc',
      clientIp: '203.0.113.7',
      body: '{"email":"ada@example.com"}'
    })
  })

  it('gives a GET no body', async () => {
    const url = await serve(echo)

    const response = await fetch(`${url}/auth/session`)

    expect(await response.json()).toMatchObject({ method: 'GET', body: null })
  })

  it('writes the status, the headers, every cookie and the body', async () => {
    const url = await serve(async () => {
      const headers = new Headers({ Location: '/home', 'Content-Type': 'text/plain' })
      headers.append('Set-Cookie', 'a=1; Path=/; HttpOnly')
      headers.append('Set-Cookie', 'b=2; Path=/; HttpOnly')
      return new Response('moved', { status: 302, headers })
    })

    const response = await fetch(`${url}/auth/callback`, { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/home')
    expect(response.headers.getSetCookie()).toEqual(['a=1; Path=/; HttpOnly', 'b=2; Path=/; HttpOnly'])
    expect(await response.text()).toBe('moved')
  })

  it('reads a chunked body under the limit', async () => {
    const url = await serve(echo)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"email":"ada@example.com"}'))
        controller.close()
      }
    })

    const response = await fetch(`${url}/auth/sign-in`, postJson(stream))

    expect(await response.json()).toMatchObject({ body: '{"email":"ada@example.com"}' })
  })

  it('answers 413 to a chunked body over the limit, before the handler', async () => {
    const handle = vi.fn(echo)
    const url = await serve(handle)
    // Just over the limit: the rest of the upload drains at once and the server closes promptly.
    const chunk = new Uint8Array(65_536).fill(32)
    const chunks = Math.ceil((BODY_LIMIT_BYTES + 1) / chunk.length)
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < chunks; i++) controller.enqueue(chunk)
        controller.close()
      }
    })

    const response = await fetch(`${url}/auth/sign-in`, postJson(stream))

    expect(response.status).toBe(413)
    expect(handle).not.toHaveBeenCalled()
  })
})
