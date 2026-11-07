import type { AddressInfo } from 'node:net'
import { customerListSchema, customerSchema } from '@repo/contracts'
import pino from 'pino'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { FakeCurrentSession } from '#modules/identity/testing/fake-current-session'
import { FakeMembership } from '#modules/identity/testing/fake-membership'
import { registerCustomerRoutes } from './customers.routes'
import { InMemoryCustomerRepository } from './testing/in-memory-customer-repository'

const ada = { userId: 'user-ada', email: 'ada@example.com', name: 'Ada' }
const closers: Array<() => Promise<void>> = []

/** The module's routes behind the real pipeline, with the tenant guard on fakes of its two ports. */
async function serve() {
  const session = new FakeCurrentSession()
  const membership = new FakeMembership()
  let count = 0
  const router = new HttpRouter()
  registerCustomerRoutes(router, {
    session,
    membership,
    repository: new InMemoryCustomerRepository(),
    clock: new FixedClock(new Date('2026-11-07T10:00:00.000Z')),
    ids: { generate: () => `id-${++count}` }
  })
  const server = createHttpServer({ router, logger: pino({ level: 'silent' }) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/organizations`

  /** Ada, signed in, with `customer` actions in `org-1`. */
  const signInWith = (actions: Array<'read' | 'create' | 'update' | 'delete'>) => {
    session.actor = ada
    membership.add({
      userId: ada.userId,
      organizationId: 'org-1',
      roles: ['custom'],
      permissions: { customer: actions }
    })
  }

  const call = (method: string, path: string, body?: unknown) =>
    fetch(`${url}/${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body)
    })
  const code = async (response: Response) => ({
    status: response.status,
    code: ((await response.json()) as { code?: string }).code
  })
  return { signInWith, call, code }
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe('the customers routes (ADR 0044)', () => {
  it('answers 401 without a session, and 404 to someone outside the organization', async () => {
    const { signInWith, call, code } = await serve()

    expect(await code(await call('GET', 'org-1/customers'))).toEqual({ status: 401, code: 'unauthenticated' })

    signInWith(['read'])
    expect(await code(await call('GET', 'org-2/customers'))).toEqual({ status: 404, code: 'organization_not_found' })
  })

  it('answers 403 for each action the role does not hold', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['read'])

    const refused = { status: 403, code: 'permission_denied' }
    expect(await code(await call('POST', 'org-1/customers', { name: 'Ada' }))).toEqual(refused)
    expect(await code(await call('PUT', 'org-1/customers/id-1', { name: 'Ada' }))).toEqual(refused)
    expect(await code(await call('POST', 'org-1/customers/id-1/archive'))).toEqual(refused)
    expect(await code(await call('POST', 'org-1/customers/id-1/restore'))).toEqual(refused)
    expect(await code(await call('DELETE', 'org-1/customers/id-1'))).toEqual(refused)
  })

  it('answers 403 to reading without the permission', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['create'])

    expect(await code(await call('GET', 'org-1/customers'))).toEqual({ status: 403, code: 'permission_denied' })
    expect(await code(await call('GET', 'org-1/customers/id-1'))).toEqual({ status: 403, code: 'permission_denied' })
  })

  it('creates, lists, reads, edits, archives, restores and deletes a customer', async () => {
    const { signInWith, call } = await serve()
    signInWith(['read', 'create', 'update', 'delete'])

    const created = await call('POST', 'org-1/customers', { name: ' Ada ', email: 'ADA@example.com' })
    expect(created.status).toBe(201)
    expect(customerSchema.parse(await created.json())).toMatchObject({
      id: 'id-1',
      name: 'Ada',
      email: 'ada@example.com'
    })

    const listed = customerListSchema.parse(await (await call('GET', 'org-1/customers?search=ada')).json())
    expect(listed.items.map((customer) => customer.id)).toEqual(['id-1'])

    expect(customerSchema.parse(await (await call('GET', 'org-1/customers/id-1')).json()).name).toBe('Ada')

    const edited = await call('PUT', 'org-1/customers/id-1', { name: 'Ada King' })
    expect(customerSchema.parse(await edited.json())).toMatchObject({ name: 'Ada King', email: null })

    const archived = customerSchema.parse(await (await call('POST', 'org-1/customers/id-1/archive')).json())
    expect(archived.archivedAt).toBe('2026-11-07T10:00:00.000Z')
    expect(customerListSchema.parse(await (await call('GET', 'org-1/customers')).json()).total).toBe(0)

    const restored = customerSchema.parse(await (await call('POST', 'org-1/customers/id-1/restore')).json())
    expect(restored.archivedAt).toBeNull()

    await call('POST', 'org-1/customers/id-1/archive')
    const deleted = await call('DELETE', 'org-1/customers/id-1')
    expect(deleted.status).toBe(204)
    expect(await deleted.text()).toBe('')
    expect((await call('GET', 'org-1/customers/id-1')).status).toBe(404)
  })

  it('names what is wrong with a body or a query', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['read', 'create'])

    expect(await code(await call('POST', 'org-1/customers', { name: '' }))).toEqual({
      status: 400,
      code: 'validation_failed'
    })
    expect(await code(await call('GET', 'org-1/customers?page=0'))).toEqual({
      status: 400,
      code: 'validation_failed'
    })
  })

  it('answers 409 for a taken email, 404 for an unknown customer and 409 for deleting an active one', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['read', 'create', 'update', 'delete'])
    await call('POST', 'org-1/customers', { name: 'Ada', email: 'ada@example.com' })

    expect(await code(await call('POST', 'org-1/customers', { name: 'Other', email: 'Ada@example.com' }))).toEqual({
      status: 409,
      code: 'customer_email_taken'
    })
    expect(await code(await call('GET', 'org-1/customers/nope'))).toEqual({
      status: 404,
      code: 'customer_not_found'
    })
    expect(await code(await call('DELETE', 'org-1/customers/id-1'))).toEqual({
      status: 409,
      code: 'customer_not_archived'
    })
  })
})
