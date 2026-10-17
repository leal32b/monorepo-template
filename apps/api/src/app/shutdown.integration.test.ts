import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import pino from 'pino'
import { sendJson } from '#libs/http/json'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { createShutdown } from './shutdown'

const logger = pino({ level: 'silent' })
const servers: Server[] = []

async function start(register: (router: HttpRouter) => void) {
  const router = new HttpRouter()
  register(router)
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  servers.push(server)
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}

afterEach(() => {
  for (const server of servers.splice(0)) server.closeAllConnections()
})

describe('createShutdown', () => {
  it('stops accepting new connections and resolves once the server is closed', async () => {
    const { server, url } = await start(() => {})

    await createShutdown({ server, logger, timeoutMs: 1_000 })('test')

    expect(server.listening).toBe(false)
    await expect(fetch(`${url}/anything`)).rejects.toThrow()
  })

  it('lets an in-flight request finish before resolving', async () => {
    let entered!: () => void
    let release!: () => void
    const handlerEntered = new Promise<void>((resolve) => (entered = resolve))
    const gate = new Promise<void>((resolve) => (release = resolve))
    const { server, url } = await start((router) =>
      router.get('/slow', async (_req, res) => {
        entered()
        await gate
        sendJson(res, 200, { done: true })
      })
    )
    const pending = fetch(`${url}/slow`)
    await handlerEntered

    let finished = false
    const shutdown = createShutdown({ server, logger, timeoutMs: 5_000 })('test').then(() => {
      finished = true
    })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(finished).toBe(false)

    release()
    const response = await pending
    await shutdown

    expect(response.status).toBe(200)
    expect(finished).toBe(true)
  })

  it('forces the connections closed when the drain takes too long', async () => {
    let entered!: () => void
    const handlerEntered = new Promise<void>((resolve) => (entered = resolve))
    const { server, url } = await start((router) =>
      router.get('/stuck', () => {
        entered()
        return new Promise<void>(() => {})
      })
    )
    const pending = fetch(`${url}/stuck`).catch((error: unknown) => error)
    await handlerEntered

    await createShutdown({ server, logger, timeoutMs: 50 })('test')

    expect(await pending).toBeInstanceOf(Error)
  })

  it('is idempotent: a second call returns the same shutdown', async () => {
    const { server } = await start(() => {})
    const shutdown = createShutdown({ server, logger, timeoutMs: 1_000 })

    expect(shutdown('SIGTERM')).toBe(shutdown('SIGINT'))
    await shutdown('SIGTERM')
  })
})
