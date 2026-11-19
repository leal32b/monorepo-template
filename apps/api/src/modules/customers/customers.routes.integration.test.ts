import { customerListSchema, customerSchema, publicCustomerRegistrationSchema } from '@repo/contracts'
import { InMemoryRateLimiter } from '#libs/adapters/in-memory-rate-limiter'
import { FakePublicOrganizations } from '#modules/identity/testing/fake-public-organizations'
import { ada, serveRoutes } from '#modules/identity/testing/serve-routes'
import { registerCustomerRoutes } from './customers.routes'
import { testCustomers } from './testing/test-customers'

/** The module's routes behind the real pipeline, with the tenant guard on fakes of its two ports. */
async function serve() {
  const { audit, unitOfWork, clock, ids, owners, webOrigin } = testCustomers()
  const { origin, signInAs, call, code, lines } = await serveRoutes((router, { session, membership, logger }) => {
    const publicSurface = {
      limiter: new InMemoryRateLimiter(clock),
      organizations: new FakePublicOrganizations([
        { id: 'org-1', name: 'Acme Barbers', slug: 'acme', timeZone: 'UTC', currency: 'USD' },
        { id: 'org-2', name: 'Other', slug: 'other', timeZone: 'UTC', currency: 'USD' }
      ]),
      logger
    }
    registerCustomerRoutes(router, { session, membership, publicSurface, unitOfWork, clock, ids, owners, webOrigin })
  })
  /** A visitor, with no session, asks to be a customer of the organization with this slug. */
  const register = (slug: string, body: unknown, address = '203.0.113.7') =>
    fetch(`${origin}/api/public/organizations/${slug}/customer-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-IP': address, 'X-Request-Id': 'req-1' },
      body: JSON.stringify(body)
    })
  return {
    /** Ada, signed in, with `customer` actions in `org-1`, on a plan with no limit unless `plan` says otherwise. */
    signInWith: (actions: Array<'read' | 'create' | 'update' | 'delete'>, plan: Parameters<typeof signInAs>[1] = {}) =>
      signInAs({ customer: actions }, plan),
    call: (method: string, path: string, body?: unknown) => call(method, `/api/organizations/${path}`, body),
    code,
    audit,
    register,
    clock,
    lines
  }
}

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
    const { signInWith, call, audit } = await serve()
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

    const edited = await call('PUT', 'org-1/customers/id-1', { name: 'Ada King', version: 1 })
    expect(customerSchema.parse(await edited.json())).toMatchObject({ name: 'Ada King', email: null, version: 2 })

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
    // Every write left its entry, by the member the guard returned (ADR 0061).
    const entries = await audit.list('org-1', { limit: 10 })
    expect(entries.map((entry) => [entry.action, entry.fields])).toEqual([
      ['deleted', []],
      ['archived', []],
      ['restored', []],
      ['archived', []],
      ['updated', ['name', 'email']],
      ['created', ['name', 'email']]
    ])
    expect(new Set(entries.map((entry) => JSON.stringify([entry.resourceId, entry.actor])))).toEqual(
      new Set([JSON.stringify(['id-1', { kind: 'member', id: ada.userId }])])
    )
  })

  it('answers 409 to an edit from someone who read an older version, and keeps the newer one', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['read', 'create', 'update'])
    await call('POST', 'org-1/customers', { name: 'Ada' })
    await call('PUT', 'org-1/customers/id-1', { name: 'Ada King', version: 1 })

    expect(await code(await call('PUT', 'org-1/customers/id-1', { name: 'Ada Byron', version: 1 }))).toEqual({
      status: 409,
      code: 'customer_changed'
    })
    expect(customerSchema.parse(await (await call('GET', 'org-1/customers/id-1')).json()).name).toBe('Ada King')
  })

  it('names what is wrong with a body or a query', async () => {
    const { signInWith, call, code } = await serve()
    signInWith(['read', 'create', 'update'])

    expect(await code(await call('POST', 'org-1/customers', { name: '' }))).toEqual({
      status: 400,
      code: 'validation_failed'
    })
    expect(await code(await call('PUT', 'org-1/customers/id-1', { name: 'Ada' }))).toEqual({
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

describe('the public customer registration (ADR 0059)', () => {
  const grace = { name: ' Grace Hopper ', email: 'Grace@Example.com' }
  const received = async (response: Response) => ({
    status: response.status,
    body: publicCustomerRegistrationSchema.parse(await response.json())
  })
  const taken = { status: 202, body: { received: true } }

  it('takes a visitor in without a session, as a customer the members see, created by a visitor', async () => {
    const { signInWith, call, register, audit } = await serve()

    const response = await register('acme', grace)

    expect(await response.clone().json()).toEqual({ received: true })
    expect(await received(response)).toEqual(taken)
    signInWith(['read'])
    const listed = customerListSchema.parse(await (await call('GET', 'org-1/customers')).json())
    expect(listed.items).toMatchObject([
      { name: 'Grace Hopper', email: 'grace@example.com', phone: null, company: null, notes: null, archivedAt: null }
    ])
    expect(await audit.list('org-1', { limit: 10 })).toMatchObject([
      { resourceId: listed.items[0]?.id, action: 'created', actor: { kind: 'visitor' } }
    ])
    expect(await audit.list('org-2', { limit: 10 })).toEqual([])
  })

  it('answers the same when the email is already a customer, and adds nothing', async () => {
    const { signInWith, call, register } = await serve()
    await register('acme', grace)

    expect(await received(await register('acme', { name: 'Someone else', email: 'grace@example.com' }))).toEqual(taken)

    signInWith(['read'])
    const listed = customerListSchema.parse(await (await call('GET', 'org-1/customers')).json())
    expect(listed.items.map((customer) => customer.name)).toEqual(['Grace Hopper'])
  })

  it('answers the same to a request that fills the honeypot, writes nothing and says so in the log', async () => {
    const { signInWith, call, register, lines } = await serve()

    expect(await received(await register('acme', { ...grace, referralCode: 'cheap loans' }))).toEqual(taken)

    signInWith(['read'])
    expect(customerListSchema.parse(await (await call('GET', 'org-1/customers')).json()).total).toBe(0)
    expect(lines.find((line) => line.msg === 'public write ignored')).toEqual({
      level: 30,
      reqId: 'req-1',
      reason: 'honeypot',
      msg: 'public write ignored'
    })
  })

  it('answers 404 for a slug no organization has, before reading the body', async () => {
    const { register, code } = await serve()

    expect(await code(await register('nobody', { not: 'even valid' }))).toEqual({
      status: 404,
      code: 'organization_not_found'
    })
  })

  it('answers 400 with each field that is wrong, and asks for an email or a phone', async () => {
    const { register } = await serve()

    const response = await register('acme', { name: '', phone: '5'.repeat(41) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      code: 'validation_failed',
      errors: [{ path: 'name' }, { path: 'phone' }]
    })
    expect(await (await register('acme', { name: 'Grace' })).json()).toMatchObject({
      code: 'validation_failed',
      errors: [{ path: 'email', message: 'An email or a phone is required.' }]
    })
  })

  it('answers 429 with Retry-After past 10 registrations in 10 minutes from one address, then recovers', async () => {
    const { register, clock, signInWith, call } = await serve()
    for (let i = 0; i < 10; i++) await register('acme', { name: 'Grace', email: `grace-${i}@example.com` })

    clock.advance(60_000)
    const refused = await register('acme', { name: 'Grace', email: 'grace-10@example.com' })

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('540')
    expect(await refused.json()).toMatchObject({ code: 'rate_limited', retryAfter: 540 })
    expect((await register('acme', { name: 'Ada', phone: '555 0100' }, '203.0.113.8')).status).toBe(202)

    clock.advance(540_000)
    expect((await register('acme', { name: 'Grace', email: 'grace-10@example.com' })).status).toBe(202)
    signInWith(['read'])
    expect(customerListSchema.parse(await (await call('GET', 'org-1/customers')).json()).total).toBe(12)
  })

  describe("the plan's limit of active customers (ADR 0063)", () => {
    const oneCustomer = { entitlements: { capabilities: [], limits: { 'customers.max': 1 } } }

    it('refuses creating and restoring past customers.max with 403 plan_limit_reached, naming the limit; archiving frees room', async () => {
      const { signInWith, call } = await serve()
      signInWith(['read', 'create', 'update'], oneCustomer)
      const first = customerSchema.parse(await (await call('POST', 'org-1/customers', { name: 'Ada' })).json())

      const refused = await call('POST', 'org-1/customers', { name: 'Bob' })
      expect(refused.status).toBe(403)
      expect(await refused.json()).toMatchObject({ code: 'plan_limit_reached', entitlement: 'customers.max', limit: 1 })

      await call('POST', `org-1/customers/${first.id}/archive`)
      const second = await call('POST', 'org-1/customers', { name: 'Bob' })
      expect(second.status).toBe(201)
      const restore = await call('POST', `org-1/customers/${first.id}/restore`)
      expect(restore.status).toBe(403)
      expect(await restore.json()).toMatchObject({ code: 'plan_limit_reached', limit: 1 })
    })

    it('never refuses a visitor’s registration, whose customer counts toward the limit', async () => {
      const { signInWith, call, register } = await serve()
      signInWith(['read', 'create'], oneCustomer)

      expect((await register('acme', { name: 'Ada Visitor', email: 'ada@example.com' })).status).toBe(202)
      expect((await register('acme', { name: 'Bob Visitor', phone: '555 0100' })).status).toBe(202)

      const list = customerListSchema.parse(await (await call('GET', 'org-1/customers')).json())
      expect(list.total).toBe(2)
      expect((await call('POST', 'org-1/customers', { name: 'Cy' })).status).toBe(403)
    })
  })
})
