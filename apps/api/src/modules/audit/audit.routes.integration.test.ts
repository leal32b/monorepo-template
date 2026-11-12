import type { AddressInfo } from 'node:net'
import { apiProblemSchema, auditEntryPageSchema } from '@repo/contracts'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import { anEntry } from '#libs/audit/testing/audit-trail.contract'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { FakeCurrentSession } from '#modules/identity/testing/fake-current-session'
import { FakeMembership } from '#modules/identity/testing/fake-membership'
import { registerAuditRoutes } from './audit.routes'

const closers: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const close of closers.splice(0)) await close()
})

/** The route behind the real pipeline, with the tenant guard on fakes of its two ports. */
async function serve() {
  const session = new FakeCurrentSession()
  const membership = new FakeMembership()
  const audit = new InMemoryAuditTrail()
  const router = new HttpRouter()
  registerAuditRoutes(router, { session, membership, unitOfWork: new InMemoryUnitOfWork({ audit }) })
  const server = createHttpServer({ router, logger: memoryLogger().logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/organizations/org-1/audit-entries`

  /** Ada, signed in to `org-1`, holding `permissions`. */
  const signInWith = (permissions: { audit?: 'read'[] }) => {
    session.actor = { userId: 'user-ada', email: 'ada@example.com', name: 'Ada' }
    membership.add({ userId: 'user-ada', organizationId: 'org-1', roles: ['custom'], permissions }, 'Ada Lovelace')
  }
  return { audit, signInWith, get: (query = '') => fetch(`${url}${query}`) }
}

describe('the audit trail route (ADR 0061)', () => {
  it('lists the entries for a member who holds audit:read, with the names of members', async () => {
    const { audit, signInWith, get } = await serve()
    signInWith({ audit: ['read'] })
    await audit.record(anEntry('e1', { actor: { kind: 'member', id: 'user-ada' } }))

    const response = await get()

    expect(response.status).toBe(200)
    expect(auditEntryPageSchema.parse(await response.json())).toMatchObject({
      items: [{ id: 'e1', actor: { kind: 'member', id: 'user-ada', name: 'Ada Lovelace' } }],
      next: null
    })
  })

  it('refuses a member without it, and a caller without a session', async () => {
    const { signInWith, get } = await serve()

    expect((await get()).status).toBe(401)
    signInWith({})
    const refused = await get()
    expect(refused.status).toBe(403)
    expect(apiProblemSchema.parse(await refused.json()).code).toBe('permission_denied')
  })

  it('refuses a cursor it did not write, and an unknown parameter', async () => {
    const { signInWith, get } = await serve()
    signInWith({ audit: ['read'] })

    for (const query of ['?before=not-a-cursor', '?page=2']) {
      const refused = await get(query)
      expect(refused.status).toBe(400)
      expect(apiProblemSchema.parse(await refused.json()).code).toBe('validation_failed')
    }
  })
})
