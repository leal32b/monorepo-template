import type { AddressInfo } from 'node:net'
import type { Permissions } from '@repo/contracts'
import type { Logger } from 'pino'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { TenantGuard } from '../tenant-route'
import { FakeCurrentSession } from './fake-current-session'
import { FakeMembership, type GivenMember } from './fake-membership'

/** Who a route test signs in as. */
export const ada = {
  userId: 'user-ada',
  email: 'ada@example.com',
  name: 'Ada',
  signedInAt: new Date('2026-01-01T00:00:00Z')
}

/**
 * A module's routes on the real pipeline (ADR 0065), with the tenant guard on fakes of its two ports
 * and a logger that keeps its lines; the server closes when the test ends. Every route test of a
 * module starts here, so none copies the setup.
 */
export async function serveRoutes(register: (router: HttpRouter, ports: TenantGuard & { logger: Logger }) => void) {
  const session = new FakeCurrentSession()
  const membership = new FakeMembership()
  const { logger, lines } = memoryLogger()
  const router = new HttpRouter()
  register(router, { session, membership, logger })
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    origin,
    lines,
    /**
     * Ada signs in, a member of `organizationId` whose roles hold `permissions`, named `name` to the
     * audit trail. The organization pays for a plan that grants everything, with full access, unless
     * `subscription` or `entitlements` say otherwise (ADR 0063); an operator inside it with `impersonation` (ADR 0077).
     */
    signInAs(
      permissions: Permissions,
      {
        organizationId = 'org-1',
        name = ada.userId,
        ...plan
      }: { organizationId?: string; name?: string } & Pick<
        GivenMember,
        'subscription' | 'entitlements' | 'impersonation'
      > = {}
    ): void {
      session.actor = ada
      membership.add({ userId: ada.userId, organizationId, roles: ['custom'], permissions, ...plan }, name)
    },
    /** A request to `path`, with `body` sent as JSON when there is one; a redirect is answered, not followed. */
    call(method: string, path: string, body?: unknown): Promise<Response> {
      return fetch(`${origin}${path}`, {
        method,
        redirect: 'manual',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? null : JSON.stringify(body)
      })
    },
    /** The status of a problem answer and its `code`. */
    async code(response: Response): Promise<{ status: number; code: string | undefined }> {
      return { status: response.status, code: ((await response.json()) as { code?: string }).code }
    }
  }
}
