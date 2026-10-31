import type { AddressInfo } from 'node:net'
import { apiProblemSchema } from '@repo/contracts'
import pino, { type Logger } from 'pino'
import { z } from 'zod'
import { ConflictException } from '#libs/exceptions/exception.base'
import { BODY_LIMIT_BYTES, readValidJson } from './body'
import { sendJson } from './json'
import { type HttpHandler, HttpRouter } from './router'
import { createHttpServer, type HttpServerOptions } from './server'

class NameTaken extends ConflictException {
  readonly code = 'name_taken'
}

const closers: Array<() => Promise<void>> = []

type StartOptions = Omit<HttpServerOptions, 'router' | 'logger'> & { logger?: Logger }

async function start(
  register: (router: HttpRouter) => void,
  { logger = pino({ level: 'silent' }), ...options }: StartOptions = {}
) {
  const router = new HttpRouter()
  register(router)
  const server = createHttpServer({ router, logger, ...options })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

const ok: HttpHandler = (_req, res) => sendJson(res, 200, { hello: 'world' })

describe('HTTP server', () => {
  it('serves a registered route as JSON', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await response.json()).toEqual({ hello: 'world' })
  })

  it('answers an unknown path with a 404 problem carrying the request id', async () => {
    const url = await start(() => {})

    const response = await fetch(`${url}/nope`)
    const body = apiProblemSchema.parse(await response.json())

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8')
    expect(body.code).toBe('not_found')
    expect(body.requestId).toBe(response.headers.get('x-request-id'))
  })

  it('answers a known path with another method as 405 and an Allow header', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS')
    expect(apiProblemSchema.parse(await response.json()).code).toBe('method_not_allowed')
  })

  it('answers HEAD like GET, with the same headers and no body', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`, { method: 'HEAD' })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(response.headers.get('content-length')).toBe('17') // {"hello":"world"}
    expect(await response.text()).toBe('')
  })

  it('answers OPTIONS on a known path with 204 and the Allow header', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`, { method: 'OPTIONS' })

    expect(response.status).toBe(204)
    expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS')
    expect(await response.text()).toBe('')
  })

  it('answers OPTIONS on an unknown path with 404', async () => {
    const url = await start(() => {})

    const response = await fetch(`${url}/nope`, { method: 'OPTIONS' })

    expect(response.status).toBe(404)
  })

  it('answers a malformed path encoding as 400', async () => {
    const url = await start((router) => router.get('/items/:id', ok))

    const response = await fetch(`${url}/items/%E0%A4%A`)

    expect(response.status).toBe(400)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('invalid_path')
  })

  it('keeps a well-formed X-Request-Id sent by the client', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`, { headers: { 'X-Request-Id': 'trace-123' } })

    expect(response.headers.get('x-request-id')).toBe('trace-123')
  })

  it('replaces a malformed X-Request-Id with a generated one', async () => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}/hello`, { headers: { 'X-Request-Id': 'bad id!' } })

    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('maps an expected exception to its problem, with the exception code', async () => {
    const url = await start((router) =>
      router.get('/hello', () => {
        throw new NameTaken('That name is taken')
      })
    )

    const response = await fetch(`${url}/hello`)
    const body = apiProblemSchema.parse(await response.json())

    expect(response.status).toBe(409)
    expect(body.code).toBe('name_taken')
  })

  it('answers an async failure the same way', async () => {
    const url = await start((router) =>
      router.get('/hello', async () => {
        throw new NameTaken('That name is taken')
      })
    )

    expect((await fetch(`${url}/hello`)).status).toBe(409)
  })

  it('hides unexpected failures from the client and logs them', async () => {
    const logger = pino({ level: 'silent' })
    const error = vi.spyOn(logger, 'error')
    const url = await start(
      (router) =>
        router.get('/hello', () => {
          throw new Error('db password is hunter2')
        }),
      { logger }
    )

    const response = await fetch(`${url}/hello`)
    const text = await response.text()

    expect(response.status).toBe(500)
    expect(text).not.toContain('hunter2')
    expect(apiProblemSchema.parse(JSON.parse(text)).code).toBe('internal_error')
    expect(error).toHaveBeenCalled()
  })

  it('writes one access-log line per request, without headers or bodies', async () => {
    const logger = pino({ level: 'silent' })
    const info = vi.spyOn(logger, 'info')
    const url = await start((router) => router.get('/items/:id', ok), { logger })

    await fetch(`${url}/items/7`, { headers: { Authorization: 'secret-token' } })
    await vi.waitFor(() => expect(info).toHaveBeenCalledTimes(1))

    const [line] = info.mock.calls[0] as [Record<string, unknown>]
    expect(line).toMatchObject({ method: 'GET', route: '/items/:id', path: '/items/7', status: 200 })
    expect(JSON.stringify(line)).not.toContain('secret-token')
  })

  it('logs a rejected request as a warning', async () => {
    const logger = pino({ level: 'silent' })
    const warn = vi.spyOn(logger, 'warn')
    const url = await start(() => {}, { logger })

    await fetch(`${url}/nope`)
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
  })

  it('routes on the path only, ignoring the query string', async () => {
    const url = await start((router) => router.get('/hello', ok))

    expect((await fetch(`${url}/hello?x=1`)).status).toBe(200)
  })

  it('cuts the connection when a handler fails after the response started', async () => {
    const url = await start((router) =>
      router.get('/hello', (_req, res) => {
        res.write('partial')
        throw new Error('too late')
      })
    )

    await expect(fetch(`${url}/hello`).then((response) => response.text())).rejects.toThrow()
  })
})

describe('CORS', () => {
  const origin = 'https://app.example.com'

  it('lets an allowed origin read the response and its request id', async () => {
    const url = await start((router) => router.get('/hello', ok), { corsOrigins: [origin] })

    const response = await fetch(`${url}/hello`, { headers: { Origin: origin } })

    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('access-control-expose-headers')).toBe('X-Request-Id')
    expect(response.headers.get('vary')).toBe('Origin')
  })

  it('lets an allowed origin read error responses too', async () => {
    const url = await start(() => {}, { corsOrigins: [origin] })

    const response = await fetch(`${url}/nope`, { headers: { Origin: origin } })

    expect(response.status).toBe(404)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  })

  it('sends no CORS headers to an origin outside the allowlist, but still serves it', async () => {
    const url = await start((router) => router.get('/hello', ok), { corsOrigins: [origin] })

    const response = await fetch(`${url}/hello`, { headers: { Origin: 'https://evil.example' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(response.headers.get('vary')).toBe('Origin')
  })

  const preflight = { 'Access-Control-Request-Method': 'GET' }

  it('answers a preflight from an allowed origin with the methods and headers it may use', async () => {
    const url = await start((router) => router.get('/hello', ok), { corsOrigins: [origin] })

    const response = await fetch(`${url}/hello`, { method: 'OPTIONS', headers: { Origin: origin, ...preflight } })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS')
    expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type, X-Request-Id')
    expect(response.headers.get('access-control-max-age')).toBe('600')
  })

  it('answers a preflight from another origin without granting anything', async () => {
    const url = await start((router) => router.get('/hello', ok), { corsOrigins: [origin] })

    const response = await fetch(`${url}/hello`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', ...preflight }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(response.headers.get('access-control-allow-methods')).toBeNull()
  })

  it('treats OPTIONS without Access-Control-Request-Method as a plain OPTIONS', async () => {
    const url = await start((router) => router.get('/hello', ok), { corsOrigins: [origin] })

    const response = await fetch(`${url}/hello`, { method: 'OPTIONS', headers: { Origin: origin } })

    expect(response.status).toBe(204)
    expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS')
    expect(response.headers.get('access-control-allow-methods')).toBeNull()
  })
})

describe('security headers', () => {
  it.each([
    ['a route', '/hello'],
    ['a problem', '/nope']
  ])('are sent on %s', async (_case, path) => {
    const url = await start((router) => router.get('/hello', ok))

    const response = await fetch(`${url}${path}`)

    expect(Object.fromEntries(response.headers)).toMatchObject({
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'cross-origin-resource-policy': 'same-origin',
      'x-content-type-options': 'nosniff'
    })
  })
})

describe('the web Worker secret (ADR 0022)', () => {
  const proxySecret = '0123456789abcdef'.repeat(4)
  const register = (router: HttpRouter) => {
    router.get('/hello', ok)
    router.get('/health', ok)
  }
  const options = { proxySecret, publicPaths: ['/health'] }

  it('serves a request that carries the secret', async () => {
    const url = await start(register, options)

    const response = await fetch(`${url}/hello`, { headers: { 'X-Proxy-Secret': proxySecret } })

    expect(response.status).toBe(200)
  })

  it.each([
    ['without the secret', {}],
    ['with a wrong secret', { 'X-Proxy-Secret': 'f'.repeat(64) }],
    ['with a secret of another length', { 'X-Proxy-Secret': 'f' }]
  ])('refuses a request %s', async (_case, headers) => {
    const url = await start(register, options)

    const response = await fetch(`${url}/hello`, { headers })

    expect(response.status).toBe(403)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('proxy_required')
  })

  it('refuses before routing, so a direct caller learns no paths', async () => {
    const url = await start(register, options)

    expect((await fetch(`${url}/nope`)).status).toBe(403)
  })

  it('serves the public paths without the secret', async () => {
    const url = await start(register, options)

    expect((await fetch(`${url}/health`)).status).toBe(200)
  })
})

describe('writes from other origins (threat model T06)', () => {
  const webOrigin = 'https://app.example.com'
  const options = { trustedOrigins: [webOrigin] }

  it('accepts a write from a trusted origin', async () => {
    const url = await start((router) => router.post('/items', ok), options)

    const response = await fetch(`${url}/items`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'Sec-Fetch-Site': 'same-origin' }
    })

    expect(response.status).toBe(200)
  })

  it('accepts a write from a client that is not a browser', async () => {
    const url = await start((router) => router.post('/items', ok), options)

    expect((await fetch(`${url}/items`, { method: 'POST' })).status).toBe(200)
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('refuses a %s from another origin', async (method) => {
    const url = await start((router) => router.on(method, '/items', ok), options)

    const response = await fetch(`${url}/items`, { method, headers: { Origin: 'https://evil.example' } })

    expect(response.status).toBe(403)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('origin_not_allowed')
  })

  it.each([
    ['an opaque origin', { Origin: 'null' }],
    ['another site, by Fetch Metadata', { 'Sec-Fetch-Site': 'cross-site' }],
    ['another host of the same site', { 'Sec-Fetch-Site': 'same-site' }]
  ])('refuses a write from %s', async (_case, headers) => {
    const url = await start((router) => router.post('/items', ok), options)

    const response = await fetch(`${url}/items`, { method: 'POST', headers })

    expect(response.status).toBe(403)
  })

  it('lets any origin read', async () => {
    const url = await start((router) => router.get('/items', ok), options)

    const response = await fetch(`${url}/items`, {
      headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }
    })

    expect(response.status).toBe(200)
  })
})

describe('JSON request bodies', () => {
  const itemSchema = z.object({ name: z.string().min(1) })
  const echo: HttpHandler = async (req, res) => sendJson(res, 200, await readValidJson(req, itemSchema))
  const postJson = (body: NonNullable<RequestInit['body']>) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    duplex: 'half' as const
  })

  it('reads a body that matches the schema, dropping unknown fields', async () => {
    const url = await start((router) => router.post('/items', echo))

    const response = await fetch(`${url}/items`, postJson('{"name":"Ada","admin":true}'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: 'Ada' })
  })

  it('answers 400 to a body that is not JSON', async () => {
    const url = await start((router) => router.post('/items', echo))

    const response = await fetch(`${url}/items`, postJson('{"name":'))

    expect(response.status).toBe(400)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('invalid_json')
  })

  it('answers 400 listing each field that does not match', async () => {
    const url = await start((router) => router.post('/items', echo))

    const response = await fetch(`${url}/items`, postJson('{"name":""}'))
    const body = apiProblemSchema.parse(await response.json())

    expect(response.status).toBe(400)
    expect(body.code).toBe('validation_failed')
    expect(body.errors).toEqual([{ path: 'name', message: expect.any(String) }])
  })

  it('reads an empty body as an empty object, so the schema names the missing fields', async () => {
    const url = await start((router) => router.post('/items', echo))

    const response = await fetch(`${url}/items`, postJson(''))

    expect(apiProblemSchema.parse(await response.json()).errors).toEqual([
      { path: 'name', message: expect.any(String) }
    ])
  })

  it.each([
    ['text/plain;charset=UTF-8', 'name=Ada'],
    ['application/x-www-form-urlencoded', 'name=Ada']
  ])('answers 415 to a %s body, before the handler', async (contentType, body) => {
    const handler = vi.fn(echo)
    const url = await start((router) => router.post('/items', handler))

    const response = await fetch(`${url}/items`, { method: 'POST', headers: { 'Content-Type': contentType }, body })

    expect(response.status).toBe(415)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('unsupported_media_type')
    expect(handler).not.toHaveBeenCalled()
  })

  it('accepts JSON with parameters, in any case', async () => {
    const url = await start((router) => router.post('/items', echo))

    const response = await fetch(`${url}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'Application/JSON; charset=utf-8' },
      body: '{"name":"Ada"}'
    })

    expect(response.status).toBe(200)
  })

  it('answers 413 to a declared length over the limit, before the handler', async () => {
    const handler = vi.fn(echo)
    const url = await start((router) => router.post('/items', handler))

    const response = await fetch(`${url}/items`, postJson('x'.repeat(BODY_LIMIT_BYTES + 1)))

    expect(response.status).toBe(413)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('payload_too_large')
    expect(handler).not.toHaveBeenCalled()
  })

  it('answers 413 once a chunked body passes the limit', async () => {
    const url = await start((router) => router.post('/items', echo))
    const chunk = new Uint8Array(65_536).fill(32)
    const chunks = Math.ceil((BODY_LIMIT_BYTES + 1) / chunk.length)
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < chunks; i++) controller.enqueue(chunk)
        controller.close()
      }
    })

    const response = await fetch(`${url}/items`, postJson(stream))

    expect(response.status).toBe(413)
  })
})
