import * as z from 'zod/mini'
import { FileDownload } from '#libs/http/file'
import { HttpRouter } from '#libs/http/router'
import { tenantRoutes } from './tenant-route'
import { FakeCurrentSession } from './testing/fake-current-session'
import { FakeMembership } from './testing/fake-membership'
import { ada, serveRoutes } from './testing/serve-routes'

const thing = z.strictObject({ name: z.string().check(z.minLength(1)) })
const page = z.strictObject({ page: z.coerce.number().check(z.int(), z.positive()) })

/** Routes that echo what the helper hands their use case, on the real pipeline. */
async function serve() {
  const { signInAs, call, code } = await serveRoutes((router, guard) => {
    const tenant = tenantRoutes(router, guard)
    const base = '/api/organizations/:organizationId/things'
    tenant.get(base, { permission: { customer: ['read'] }, input: page }, async ({ organizationId, input }) => ({
      organizationId,
      page: input.page
    }))
    tenant.post(base, { permission: { customer: ['create'] }, input: thing, status: 201 }, async (request) => request)
    tenant.put(
      `${base}/:thingId`,
      { permission: { customer: ['update'] }, input: thing },
      async ({ params, input }) => ({
        id: params.thingId,
        name: input.name
      })
    )
    tenant.post(`${base}/:thingId/archive`, { permission: { customer: ['update'] } }, async ({ params, input }) => ({
      id: params.thingId,
      input: input ?? 'none'
    }))
    tenant.delete(`${base}/:thingId`, { permission: { customer: ['delete'] } }, async () => undefined)
    // A file to download (ADR 0074).
    tenant.get(
      `${base}/:thingId/file`,
      { permission: { customer: ['read'] } },
      async () => new FileDownload('things 2026.zip', 'application/zip', Buffer.from('PK\u0003\u0004'))
    )
    // A capability of the plan, on a read and on a write (ADR 0063).
    tenant.get(`${base}/report`, { permission: { customer: ['read'] }, entitlement: 'activity-log' }, async () => ({
      report: true
    }))
    tenant.post(
      `${base}/report`,
      { permission: { customer: ['create'] }, entitlement: 'activity-log', input: thing },
      async ({ input }) => input
    )
    // A route that serves billing, so the owner can pay while the organization is read only.
    tenant.post(
      '/api/organizations/:organizationId/billing/checkout',
      { permission: {}, duringReadOnly: true },
      async ({ member }) => ({ paying: member.userId })
    )
  })
  return {
    /** Ada, signed in, with `customer` actions in `org-1`, in an organization that pays unless `plan` says otherwise. */
    signInWith: (actions: Array<'read' | 'create' | 'update' | 'delete'>, plan: Parameters<typeof signInAs>[1] = {}) =>
      signInAs({ customer: actions }, plan),
    call: (method: string, path: string, body?: unknown) => call(method, `/api/organizations/${path}`, body),
    code
  }
}

const readOnly = { subscription: { status: 'cancelled' as const, access: 'read-only' as const } }
const withoutActivityLog = { entitlements: { capabilities: [], limits: { 'customers.max': 100 } } }

describe('tenantRoutes (ADR 0065)', () => {
  it('answers 401 without a session, 404 outside the organization and 403 without the permission, before reading the input', async () => {
    const { signInWith, call, code } = await serve()

    expect(await code(await call('POST', 'org-1/things', { name: '' }))).toEqual({
      status: 401,
      code: 'unauthenticated'
    })
    signInWith(['read'])
    expect(await code(await call('POST', 'org-2/things', { name: '' }))).toEqual({
      status: 404,
      code: 'organization_not_found'
    })
    expect(await code(await call('POST', 'org-1/things', { name: '' }))).toEqual({
      status: 403,
      code: 'permission_denied'
    })
  })

  it('hands the use case the organization, the body parsed by its schema, the path, the member as the actor, and the member', async () => {
    const { signInWith, call } = await serve()
    signInWith(['create'])

    const response = await call('POST', 'org-1/things', { name: 'Lamp' })

    expect(response.status).toBe(201)
    const { member, ...request } = (await response.json()) as { member: unknown }
    expect(request).toEqual({
      organizationId: 'org-1',
      input: { name: 'Lamp' },
      params: { organizationId: 'org-1' },
      actor: { kind: 'member', id: ada.userId }
    })
    // The member, with what the subscription grants, so a use case can enforce a limit (ADR 0063).
    expect(member).toMatchObject({
      userId: ada.userId,
      organizationId: 'org-1',
      subscription: { access: 'full' },
      entitlements: { limits: { 'customers.max': null } }
    })
  })

  it("reads a GET's input from the query string and answers 200", async () => {
    const { signInWith, call } = await serve()
    signInWith(['read'])

    const response = await call('GET', 'org-1/things?page=2')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ organizationId: 'org-1', page: 2 })
  })

  it('answers 400 naming each field when the body or the query does not match its schema', async () => {
    const { signInWith, call } = await serve()
    signInWith(['read', 'update'])

    const body = await call('PUT', 'org-1/things/t-1', { name: '', colour: 'red' })
    expect(body.status).toBe(400)
    expect(await body.json()).toMatchObject({ code: 'validation_failed', errors: [{ path: 'name' }, { path: '' }] })
    const query = await call('GET', 'org-1/things?page=0')
    expect(query.status).toBe(400)
    expect(await query.json()).toMatchObject({ code: 'validation_failed', errors: [{ path: 'page' }] })
  })

  it("hands a path's parameters by name, and no input to a route that declares none", async () => {
    const { signInWith, call } = await serve()
    signInWith(['update'])

    expect(await (await call('PUT', 'org-1/things/t-1', { name: 'Lamp' })).json()).toEqual({ id: 't-1', name: 'Lamp' })
    expect(await (await call('POST', 'org-1/things/t-1/archive', { ignored: true })).json()).toEqual({
      id: 't-1',
      input: 'none'
    })
  })

  it('refuses, when typechecked, a path outside the tenant prefix and a parameter its path does not name', () => {
    const tenant = tenantRoutes(new HttpRouter(), {
      session: new FakeCurrentSession(),
      membership: new FakeMembership()
    })
    const things = '/api/organizations/:organizationId/things/:thingId'

    // @ts-expect-error A tenant route names the organization first in its path (ADR 0033).
    expect(tenant.get('/api/things', { permission: {} }, async () => null)).toBeUndefined()
    // @ts-expect-error The path names `thingId`, not `id`.
    expect(tenant.get(things, { permission: {} }, async ({ params }) => params.id)).toBeUndefined()
  })

  it('answers 204 with no body when the use case returns nothing', async () => {
    const { signInWith, call } = await serve()
    signInWith(['delete'])

    const response = await call('DELETE', 'org-1/things/t-1')

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })

  it('answers a file as an attachment that no cache keeps (ADR 0074)', async () => {
    const { signInWith, call } = await serve()
    signInWith(['read'])

    const response = await call('GET', 'org-1/things/t-1/file')

    expect(response.status).toBe(200)
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'application/zip',
      'content-length': '4',
      'content-disposition': 'attachment; filename="things 2026.zip"',
      'cache-control': 'no-store'
    })
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from('PK\u0003\u0004'))
  })

  describe('the subscription (ADR 0063)', () => {
    it('refuses a POST and a PUT with 403 subscription_read_only while the organization is read only, after the permission and before the input', async () => {
      const { signInWith, call, code } = await serve()
      signInWith(['create', 'update'], readOnly)

      const refused = { status: 403, code: 'subscription_read_only' }
      expect(await code(await call('POST', 'org-1/things', { name: '' }))).toEqual(refused)
      expect(await code(await call('PUT', 'org-1/things/t-1', { name: '' }))).toEqual(refused)
      expect(await code(await call('POST', 'org-1/things/t-1/archive'))).toEqual(refused)
    })

    it('answers a missing permission first, while read only', async () => {
      const { signInWith, call, code } = await serve()
      signInWith(['read'], readOnly)

      expect(await code(await call('POST', 'org-1/things', { name: 'Lamp' }))).toEqual({
        status: 403,
        code: 'permission_denied'
      })
    })

    it('lets a GET and a DELETE through while read only: everything stays readable, and a record can still be deleted', async () => {
      const { signInWith, call } = await serve()
      signInWith(['read', 'delete'], readOnly)

      expect((await call('GET', 'org-1/things?page=1')).status).toBe(200)
      expect((await call('DELETE', 'org-1/things/t-1')).status).toBe(204)
    })

    it('lets a route declared to serve billing write while read only', async () => {
      const { signInWith, call } = await serve()
      signInWith([], readOnly)

      const response = await call('POST', 'org-1/billing/checkout')

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ paying: ada.userId })
    })

    it('refuses a route whose capability the plan lacks with 403 plan_required, naming it, after the permission and before the input', async () => {
      const { signInWith, call } = await serve()
      signInWith(['read', 'create'], withoutActivityLog)

      for (const response of [
        await call('GET', 'org-1/things/report'),
        await call('POST', 'org-1/things/report', {})
      ]) {
        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({ code: 'plan_required', entitlement: 'activity-log' })
      }
    })

    it('runs a route whose capability the plan holds', async () => {
      const { signInWith, call } = await serve()
      signInWith(['read'])

      expect(await (await call('GET', 'org-1/things/report')).json()).toEqual({ report: true })
    })

    it('says plan_required rather than read only when both refuse a write, since choosing a plan answers both', async () => {
      const { signInWith, call, code } = await serve()
      signInWith(['create'], { ...readOnly, ...withoutActivityLog })

      expect(await code(await call('POST', 'org-1/things/report', { name: 'Lamp' }))).toEqual({
        status: 403,
        code: 'plan_required'
      })
    })
  })
})
