import type { IncomingMessage } from 'node:http'
import { HttpProblem } from '#libs/http/problem'
import { requireMember } from './require-member'
import { FakeCurrentSession } from './testing/fake-current-session'
import { FakeMembership } from './testing/fake-membership'

const req = { headers: {} } as IncomingMessage
const ada = { userId: 'user-ada', email: 'ada@example.com', name: 'Ada' }
const member = {
  userId: 'user-ada',
  organizationId: 'org-acme',
  roles: ['editor'],
  permissions: { invitation: ['create' as const] }
}

describe('requireMember (ADR 0033)', () => {
  let session: FakeCurrentSession
  let membership: FakeMembership

  beforeEach(() => {
    session = new FakeCurrentSession()
    membership = new FakeMembership()
  })

  const problemOf = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (err: unknown) => (err instanceof HttpProblem ? { status: err.status, code: err.code } : err)
    )

  it('answers 401 without a session, before looking at the organization', async () => {
    expect(await problemOf(requireMember({ session, membership }, req, 'org-acme'))).toEqual({
      status: 401,
      code: 'unauthenticated'
    })
  })

  it('answers 404 for an organization the actor is not in, the same as for one that does not exist', async () => {
    session.actor = ada
    membership.add({ ...member, userId: 'user-bob' })

    expect(await problemOf(requireMember({ session, membership }, req, 'org-acme'))).toEqual({
      status: 404,
      code: 'organization_not_found'
    })
    expect(await problemOf(requireMember({ session, membership }, req, 'org-missing'))).toEqual({
      status: 404,
      code: 'organization_not_found'
    })
  })

  it('returns the member when no permission is asked for', async () => {
    session.actor = ada
    membership.add(member)

    expect(await requireMember({ session, membership }, req, 'org-acme')).toEqual(member)
  })

  it('returns the member when its roles hold every permission asked for', async () => {
    session.actor = ada
    membership.add(member)

    expect(await requireMember({ session, membership }, req, 'org-acme', { invitation: ['create'] })).toEqual(member)
  })

  it('answers 403 to a member who lacks a permission asked for', async () => {
    session.actor = ada
    membership.add(member)

    expect(
      await problemOf(requireMember({ session, membership }, req, 'org-acme', { invitation: ['create', 'cancel'] }))
    ).toEqual({
      status: 403,
      code: 'permission_denied'
    })
  })
})
