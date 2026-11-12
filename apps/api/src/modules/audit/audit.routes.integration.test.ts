import { apiProblemSchema, auditEntryPageSchema, auditPageSize } from '@repo/contracts'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import { anEntry } from '#libs/audit/testing/audit-trail.contract'
import { serveRoutes } from '#modules/identity/testing/serve-routes'
import { registerAuditRoutes } from './audit.routes'

/** The route behind the real pipeline, with the tenant guard on fakes of its two ports. */
async function serve() {
  const audit = new InMemoryAuditTrail()
  const { signInAs, call } = await serveRoutes((router, { session, membership }) =>
    registerAuditRoutes(router, { session, membership, unitOfWork: new InMemoryUnitOfWork({ audit }) })
  )
  return {
    audit,
    /** Ada, signed in to `org-1`, holding `permissions`. */
    signInWith: (permissions: { audit?: 'read'[] }) => signInAs(permissions, { name: 'Ada Lovelace' }),
    get: (query = '') => call('GET', `/api/organizations/org-1/audit-entries${query}`)
  }
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

  it('reads the next page from the cursor it wrote', async () => {
    const { audit, signInWith, get } = await serve()
    signInWith({ audit: ['read'] })
    for (let i = 0; i <= auditPageSize; i++) await audit.record(anEntry(`e${String(i).padStart(2, '0')}`))

    const first = auditEntryPageSchema.parse(await (await get()).json())
    const second = auditEntryPageSchema.parse(await (await get(`?before=${first.next}`)).json())

    expect(first.items).toHaveLength(auditPageSize)
    expect(second).toMatchObject({ items: [{ id: 'e00' }], next: null })
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
