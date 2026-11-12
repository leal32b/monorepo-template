import {
  customerInputSchema,
  customerUpdateSchema,
  listCustomersQuerySchema,
  type PublicCustomerRegistration,
  publicCustomerRegistrationInputSchema
} from '@repo/contracts'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { type PublicSurface, publicLimits, publicRoute, type TenantGuard, tenantRoutes } from '#modules/identity/index'
import { ArchiveCustomerService } from './commands/archive-customer/archive-customer.service'
import { CreateCustomerService } from './commands/create-customer/create-customer.service'
import { DeleteCustomerService } from './commands/delete-customer/delete-customer.service'
import { RegisterCustomerService } from './commands/register-customer/register-customer.service'
import { RestoreCustomerService } from './commands/restore-customer/restore-customer.service'
import { UpdateCustomerService } from './commands/update-customer/update-customer.service'
import type { CustomersUnitOfWork } from './customers-unit-of-work.port'
import { GetCustomerService } from './queries/get-customer/get-customer.service'
import { ListCustomersService } from './queries/list-customers/list-customers.service'

export type CustomerRoutesDeps = TenantGuard & {
  /** What the module's route without a session is built from: the limiter and the slug (ADR 0059). */
  publicSurface: PublicSurface
  /** Every use case runs inside it, confined to the organization the guard returned (ADR 0055). */
  unitOfWork: CustomersUnitOfWork
  clock: Clock
  ids: IdGenerator
}

const base = '/api/organizations/:organizationId/customers'

/** Routes without a session name the tenant by its slug, under a prefix of their own (ADR 0059). */
const publicBase = '/api/public/organizations/:organizationSlug'

const received: PublicCustomerRegistration = { received: true }

/**
 * The module's HTTP edge (ADR 0065): it builds its use cases from the ports it is given, so the
 * composition root passes ports and the module stays one unit to copy, and declares each route with
 * what it asks of the member and of the input. It is given no repository: a use case reaches one only
 * inside the unit of work (ADR 0055).
 */
export function registerCustomerRoutes(router: HttpRouter, deps: CustomerRoutesDeps): void {
  const { publicSurface, unitOfWork, clock, ids } = deps
  const list = new ListCustomersService(unitOfWork)
  const get = new GetCustomerService(unitOfWork)
  const create = new CreateCustomerService(unitOfWork, clock, ids)
  const update = new UpdateCustomerService(unitOfWork, clock, ids)
  const archive = new ArchiveCustomerService(unitOfWork, clock, ids)
  const restore = new RestoreCustomerService(unitOfWork, clock, ids)
  const remove = new DeleteCustomerService(unitOfWork, clock, ids)
  const register = new RegisterCustomerService(unitOfWork, clock, ids)

  const tenant = tenantRoutes(router, deps)
  tenant.get(
    base,
    { permission: { customer: ['read'] }, input: listCustomersQuerySchema },
    ({ organizationId, input }) => list.execute(organizationId, input)
  )
  tenant.post(
    base,
    { permission: { customer: ['create'] }, input: customerInputSchema, status: 201 },
    ({ organizationId, input, actor }) => create.execute(organizationId, input, actor)
  )
  tenant.get(`${base}/:customerId`, { permission: { customer: ['read'] } }, ({ organizationId, params }) =>
    get.execute(organizationId, params.customerId)
  )
  // The whole customer, again, and the version read (ADR 0048).
  tenant.put(
    `${base}/:customerId`,
    { permission: { customer: ['update'] }, input: customerUpdateSchema },
    ({ organizationId, params, input, actor }) => update.execute(organizationId, params.customerId, input, actor)
  )
  tenant.post(
    `${base}/:customerId/archive`,
    { permission: { customer: ['update'] } },
    ({ organizationId, params, actor }) => archive.execute(organizationId, params.customerId, actor)
  )
  tenant.post(
    `${base}/:customerId/restore`,
    { permission: { customer: ['update'] } },
    ({ organizationId, params, actor }) => restore.execute(organizationId, params.customerId, actor)
  )
  // Once archived; its audit entry stays as the record of who deleted it (ADR 0061).
  tenant.delete(`${base}/:customerId`, { permission: { customer: ['delete'] } }, ({ organizationId, params, actor }) =>
    remove.execute(organizationId, params.customerId, actor)
  )

  /**
   * 202, the request was taken in (ADR 0059). The shape of a public write: `publicRoute` counts the
   * request and resolves the slug before the body is read; the answer is the same whatever the use
   * case found; a filled honeypot writes nothing, and only the log says so.
   */
  router.post(
    `${publicBase}/customer-registrations`,
    publicRoute(publicSurface, publicLimits.write, async (req, res, { organization, requestId }) => {
      const { referralCode, ...values } = await readValidJson(req, publicCustomerRegistrationInputSchema)
      if (referralCode) publicSurface.logger.info({ reqId: requestId, reason: 'honeypot' }, 'public write ignored')
      else await register.execute(organization.id, values)
      sendJson(res, 202, received)
    })
  )
}
