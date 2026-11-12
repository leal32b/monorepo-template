import * as z from 'zod/mini'
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
  })
  return {
    /** Ada, signed in, with `customer` actions in `org-1`. */
    signInWith: (actions: Array<'read' | 'create' | 'update' | 'delete'>) => signInAs({ customer: actions }),
    call: (method: string, path: string, body?: unknown) => call(method, `/api/organizations/${path}`, body),
    code
  }
}

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

  it('hands the use case the organization, the body parsed by its schema, the path and the member as the actor', async () => {
    const { signInWith, call } = await serve()
    signInWith(['create'])

    const response = await call('POST', 'org-1/things', { name: 'Lamp' })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      organizationId: 'org-1',
      input: { name: 'Lamp' },
      params: { organizationId: 'org-1' },
      actor: { kind: 'member', id: ada.userId }
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
})
