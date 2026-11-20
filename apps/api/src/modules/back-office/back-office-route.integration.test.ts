import type { AddressInfo } from 'node:net'
import * as z from 'zod/mini'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { FakeCurrentSession } from '#modules/identity/testing/fake-current-session'
import { backOfficeRoutes } from './back-office-route'
import type { OperatorAccount } from './back-office-unit-of-work.port'

const now = new Date('2026-11-20T12:00:00Z')
const otto = {
  userId: 'user-otto',
  email: 'otto@example.test',
  name: 'Otto',
  signedInAt: new Date('2026-11-20T09:00:00Z')
}
const operator: OperatorAccount = {
  userId: otto.userId,
  grantedAt: new Date('2026-11-01T00:00:00Z'),
  twoFactorEnabled: true,
  signsInOtherwise: false
}

async function serve() {
  const session = new FakeCurrentSession()
  const operators = new Map<string, OperatorAccount>()
  const router = new HttpRouter()
  const seen: unknown[] = []
  const admin = backOfficeRoutes(router, {
    session,
    operators: { find: async (id) => operators.get(id) ?? null },
    clock: new FixedClock(now)
  })
  admin.get('/api/admin/things/:thingId', { input: z.strictObject({ q: z.optional(z.string()) }) }, async (request) => {
    seen.push(request)
    return { ok: true }
  })
  admin.post('/api/admin/things', { input: z.object({ name: z.string() }), status: 201 }, async ({ input }) => input)
  admin.delete('/api/admin/things', {}, async () => undefined)
  const server = createHttpServer({ router, logger: memoryLogger().logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = (method: string, path: string, body?: unknown) =>
    fetch(`${origin}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body)
    })
  return { session, operators, seen, call }
}

/** A problem's body without its request id, which differs per request. */
const problemOf = async (response: Response) => {
  const { requestId: _, ...body } = (await response.json()) as Record<string, unknown>
  return { status: response.status, body }
}

describe('backOfficeRoutes (ADR 0077)', () => {
  it('answers whoever is not an operator exactly as a path that does not exist', async () => {
    const { session, call } = await serve()
    const missing = await problemOf(await call('GET', '/api/admin/nothing-here'))

    expect(missing.status).toBe(404)
    expect(await problemOf(await call('GET', '/api/admin/things/t-1'))).toEqual(missing)
    session.actor = otto
    expect(await problemOf(await call('GET', '/api/admin/things/t-1'))).toEqual(missing)
    expect(await problemOf(await call('POST', '/api/admin/things', { wrong: true }))).toEqual(missing)
    expect(await problemOf(await call('DELETE', '/api/admin/things'))).toEqual(missing)
    // Not even a method the path does not take tells it exists.
    expect(await problemOf(await call('PUT', '/api/admin/things'))).toEqual(missing)
    expect(await problemOf(await call('OPTIONS', '/api/admin/things'))).toEqual(missing)
  })

  it('tells an operator of a path that does not exist, and of a method a path does not take', async () => {
    const { session, operators, call } = await serve()
    session.actor = otto
    operators.set(otto.userId, operator)

    expect((await call('GET', '/api/admin/nothing-here')).status).toBe(404)
    const wrong = await call('PUT', '/api/admin/things')
    expect(wrong.status).toBe(405)
    expect(wrong.headers.get('allow')).toBe('POST, DELETE, OPTIONS')
  })

  it('serves an operator, with the input, the parameters and the operator', async () => {
    const { session, operators, seen, call } = await serve()
    session.actor = otto
    operators.set(otto.userId, operator)

    const response = await call('GET', '/api/admin/things/t-1?q=acme')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(seen).toEqual([{ input: { q: 'acme' }, params: { thingId: 't-1' }, operator: otto }])
    expect((await call('POST', '/api/admin/things', { name: 'x' })).status).toBe(201)
    expect((await call('DELETE', '/api/admin/things')).status).toBe(204)
    expect((await call('POST', '/api/admin/things', {})).status).toBe(400)
  })

  it.each([
    ['two-factor', { twoFactorEnabled: false }, otto.signedInAt],
    ['sign-in-method', { signsInOtherwise: true }, otto.signedInAt],
    ['sign-in-again', {}, new Date('2026-10-31T23:00:00Z')],
    ['sign-in-again', { grantedAt: new Date('2026-11-20T10:00:00Z') }, otto.signedInAt],
    ['sign-in-again', {}, new Date('2026-11-19T23:59:59Z')]
  ] as const)('refuses an operator whose session may not open it: %s', async (reason, account, signedInAt) => {
    const { session, operators, call } = await serve()
    session.actor = { ...otto, signedInAt }
    operators.set(otto.userId, { ...operator, ...account })

    const refused = await problemOf(await call('GET', '/api/admin/things/t-1'))

    expect(refused).toMatchObject({ status: 403, body: { code: 'operator_session_refused', reason } })
  })

  it('serves a session exactly 12 hours old', async () => {
    const { session, operators, call } = await serve()
    session.actor = { ...otto, signedInAt: new Date('2026-11-20T00:00:00Z') }
    operators.set(otto.userId, operator)

    expect((await call('GET', '/api/admin/things/t-1')).status).toBe(200)
  })
})
