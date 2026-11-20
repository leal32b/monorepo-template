import { backOfficeListQuerySchema } from '@repo/contracts'
import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { JobRegistrar } from '#libs/ports/job-queue.port'
import type { CurrentSession } from '#modules/identity/index'
import { backOfficeRoutes } from './back-office-route'
import type { BackOfficeUnitOfWork } from './back-office-unit-of-work.port'
import { EndImpersonationService } from './commands/end-impersonation/end-impersonation.service'
import { StartImpersonationService } from './commands/start-impersonation/start-impersonation.service'
import { endImpersonationJob } from './jobs/end-impersonation'
import { GetImpersonationService } from './queries/get-impersonation/get-impersonation.service'
import { GetOrganizationService } from './queries/get-organization/get-organization.service'
import { ListOrganizationsService } from './queries/list-organizations/list-organizations.service'
import { ListUsersService } from './queries/list-users/list-users.service'

export type BackOfficeDeps = { unitOfWork: BackOfficeUnitOfWork; ids: IdGenerator; clock: Clock }

/**
 * The operator back office (ADR 0077): every organization and user, an organization's page, and entering and
 * leaving one, read only. Each route is behind `backOfficeRoutes`, so whoever is not an operator gets a 404.
 */
export function registerBackOfficeRoutes(
  router: HttpRouter,
  { session, ...deps }: BackOfficeDeps & { session: CurrentSession }
): void {
  const { unitOfWork, ids, clock } = deps
  const admin = backOfficeRoutes(router, {
    session,
    operators: { find: (userId) => unitOfWork.read(({ operators }) => operators.find(userId)) },
    clock
  })
  const organizations = new ListOrganizationsService(unitOfWork, clock)
  const organization = new GetOrganizationService(unitOfWork, clock)
  const users = new ListUsersService(unitOfWork)
  const current = new GetImpersonationService(unitOfWork, clock)
  const start = new StartImpersonationService(unitOfWork, ids, clock)
  const end = new EndImpersonationService(unitOfWork, ids, clock)

  admin.get('/api/admin/organizations', { input: backOfficeListQuerySchema }, ({ input }) =>
    organizations.execute(input)
  )
  admin.get('/api/admin/organizations/:organizationId', {}, ({ params }) => organization.execute(params.organizationId))
  admin.get('/api/admin/users', { input: backOfficeListQuerySchema }, ({ input }) => users.execute(input))
  admin.get('/api/admin/impersonation', {}, ({ operator }) => current.execute(operator.userId))
  admin.post('/api/admin/organizations/:organizationId/impersonation', { status: 201 }, ({ params, operator }) =>
    start.execute(operator.userId, params.organizationId)
  )
  admin.delete('/api/admin/impersonation', {}, ({ operator }) => end.leave(operator.userId))
}

/** The job that ends a visit at its time limit, with its entry in the organization's trail (ADR 0077). */
export function registerBackOfficeJobs(registrar: JobRegistrar, deps: BackOfficeDeps): void {
  const end = new EndImpersonationService(deps.unitOfWork, deps.ids, deps.clock)
  registrar.register(endImpersonationJob, ({ impersonationId }) => end.end(impersonationId, 'expired'))
}
