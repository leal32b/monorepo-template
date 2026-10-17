import type { AddressInfo } from 'node:net'
import { apiProblemSchema } from '@repo/contracts'
import pino from 'pino'
import { ConflictException } from '#libs/exceptions/exception.base'
import { sendJson } from './json'
import { type HttpHandler, HttpRouter } from './router'
import { createHttpServer } from './server'

class NameTaken extends ConflictException {
  readonly code = 'name_taken'
}

const closers: Array<() => Promise<void>> = []

async function start(register: (router: HttpRouter) => void, logger = pino({ level: 'silent' })) {
  const router = new HttpRouter()
  register(router)
  const server = createHttpServer({ router, logger })
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
    expect(response.headers.get('allow')).toBe('GET')
    expect(apiProblemSchema.parse(await response.json()).code).toBe('method_not_allowed')
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
      logger
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
    const url = await start((router) => router.get('/items/:id', ok), logger)

    await fetch(`${url}/items/7`, { headers: { Authorization: 'secret-token' } })
    await vi.waitFor(() => expect(info).toHaveBeenCalledTimes(1))

    const [line] = info.mock.calls[0] as [Record<string, unknown>]
    expect(line).toMatchObject({ method: 'GET', route: '/items/:id', path: '/items/7', status: 200 })
    expect(JSON.stringify(line)).not.toContain('secret-token')
  })

  it('logs a rejected request as a warning', async () => {
    const logger = pino({ level: 'silent' })
    const warn = vi.spyOn(logger, 'warn')
    const url = await start(() => {}, logger)

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
