import type { AddressInfo } from 'node:net'
import {
  backOfficeOrganizationDetailSchema,
  backOfficeOrganizationPageSchema,
  backOfficeUserPageSchema,
  currentImpersonationSchema
} from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { JobRegistry } from '#libs/jobs/job-registry'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { FakeCurrentSession } from '#modules/identity/testing/fake-current-session'
import { registerBackOfficeJobs, registerBackOfficeRoutes } from './back-office.routes'
import { anOrganization, InMemoryBackOffice } from './testing/in-memory-back-office'

const now = new Date('2026-11-20T12:00:00Z')
const otto = {
  userId: 'user-otto',
  email: 'otto@example.test',
  name: 'Otto',
  signedInAt: new Date('2026-11-20T09:00:00Z')
}

/** Every route of the back office, as a request any caller can send. */
const routes: [string, string][] = [
  ['GET', '/api/admin/organizations'],
  ['GET', '/api/admin/organizations/org-acme'],
  ['GET', '/api/admin/users'],
  ['GET', '/api/admin/impersonation'],
  ['POST', '/api/admin/organizations/org-acme/impersonation'],
  ['DELETE', '/api/admin/impersonation']
]

async function serve() {
  const clock = new FixedClock(now)
  const ids = new CountingIds()
  const backOffice = new InMemoryBackOffice(ids, clock)
  backOffice.organizations.push(anOrganization('org-acme'))
  backOffice.users.push({
    id: 'user-ada',
    name: 'Ada',
    email: 'ada@example.test',
    createdAt: now,
    lastSignInAt: null,
    twoFactor: false,
    organizations: []
  })
  const session = new FakeCurrentSession()
  const router = new HttpRouter()
  registerBackOfficeRoutes(router, { session, unitOfWork: backOffice, ids, clock })
  const server = createHttpServer({ router, logger: memoryLogger().logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = (method: string, path: string) => fetch(`${origin}${path}`, { method })
  const signInAsOperator = () => {
    session.actor = otto
    backOffice.operators.set(otto.userId, {
      userId: otto.userId,
      grantedAt: new Date('2026-11-01T00:00:00Z'),
      twoFactorEnabled: true,
      signsInOtherwise: false
    })
  }
  return { backOffice, session, call, signInAsOperator, clock, ids }
}

describe('the back office routes (ADR 0077)', () => {
  it('answers 404 not_found on every route to a visitor and to a signed-in user who is not an operator', async () => {
    const { session, call } = await serve()

    for (const caller of [null, { ...otto, userId: 'user-ada' }]) {
      session.actor = caller
      for (const [method, path] of routes) {
        const response = await call(method, path)
        expect({
          method,
          path,
          status: response.status,
          code: ((await response.json()) as { code: string }).code
        }).toEqual({ method, path, status: 404, code: 'not_found' })
      }
    }
  })

  it('lists organizations and users, and reads an organization, for an operator', async () => {
    const { call, signInAsOperator } = await serve()
    signInAsOperator()

    const organizations = backOfficeOrganizationPageSchema.parse(
      await (await call('GET', '/api/admin/organizations?page=1')).json()
    )
    const organization = backOfficeOrganizationDetailSchema.parse(
      await (await call('GET', '/api/admin/organizations/org-acme')).json()
    )
    const users = backOfficeUserPageSchema.parse(await (await call('GET', '/api/admin/users?search=ada')).json())

    expect(organizations.items.map((item) => item.id)).toEqual(['org-acme'])
    expect(organization.id).toBe('org-acme')
    expect(users.items.map((item) => item.id)).toEqual(['user-ada'])
    expect((await call('GET', '/api/admin/organizations/org-missing')).status).toBe(404)
    expect((await call('GET', '/api/admin/users?page=0')).status).toBe(400)
  })

  it('enters an organization, says so, refuses a second visit, and leaves', async () => {
    const { call, signInAsOperator } = await serve()
    signInAsOperator()

    const entered = await call('POST', '/api/admin/organizations/org-acme/impersonation')
    expect(entered.status).toBe(201)
    const current = currentImpersonationSchema.parse(await (await call('GET', '/api/admin/impersonation')).json())
    expect(current.impersonation?.organization.slug).toBe('org-acme')
    const again = await call('POST', '/api/admin/organizations/org-acme/impersonation')
    expect({ status: again.status, code: ((await again.json()) as { code: string }).code }).toEqual({
      status: 409,
      code: 'impersonation_active'
    })

    expect((await call('DELETE', '/api/admin/impersonation')).status).toBe(204)
    expect(await (await call('GET', '/api/admin/impersonation')).json()).toEqual({ impersonation: null })
  })

  it('ends a visit at its time limit through its job, with its entry in the trail', async () => {
    const { backOffice, call, signInAsOperator, clock, ids } = await serve()
    signInAsOperator()
    const registry = new JobRegistry()
    registerBackOfficeJobs(registry, { unitOfWork: backOffice, ids, clock })
    await call('POST', '/api/admin/organizations/org-acme/impersonation')
    const job = backOffice.jobs.all[0] as { kind: string; payload: unknown }

    await registry
      .find(job.kind)
      ?.handler(job.payload, { jobId: 'j', attempt: 1, signal: new AbortController().signal })

    expect(backOffice.visits[0]?.endReason).toBe('expired')
    expect((await backOffice.audit.list('org-acme', { limit: 10 }))[0]?.action).toBe('impersonation-ended')
  })
})
