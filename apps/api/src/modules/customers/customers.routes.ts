import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CurrentSession, Membership, PublicSurface } from '#modules/identity/index'
import { ArchiveCustomerController } from './commands/archive-customer/archive-customer.http-controller'
import { ArchiveCustomerService } from './commands/archive-customer/archive-customer.service'
import { CreateCustomerController } from './commands/create-customer/create-customer.http-controller'
import { CreateCustomerService } from './commands/create-customer/create-customer.service'
import { DeleteCustomerController } from './commands/delete-customer/delete-customer.http-controller'
import { DeleteCustomerService } from './commands/delete-customer/delete-customer.service'
import { RegisterCustomerController } from './commands/register-customer/register-customer.http-controller'
import { RegisterCustomerService } from './commands/register-customer/register-customer.service'
import { RestoreCustomerController } from './commands/restore-customer/restore-customer.http-controller'
import { RestoreCustomerService } from './commands/restore-customer/restore-customer.service'
import { UpdateCustomerController } from './commands/update-customer/update-customer.http-controller'
import { UpdateCustomerService } from './commands/update-customer/update-customer.service'
import type { CustomersUnitOfWork } from './customers-unit-of-work.port'
import { GetCustomerController } from './queries/get-customer/get-customer.http-controller'
import { GetCustomerService } from './queries/get-customer/get-customer.service'
import { ListCustomersController } from './queries/list-customers/list-customers.http-controller'
import { ListCustomersService } from './queries/list-customers/list-customers.service'

export type CustomerRoutesDeps = {
  session: CurrentSession
  membership: Membership
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

/**
 * The module's routes, each behind the tenant guard (ADR 0033): the module builds its use cases from
 * the ports it is given, so the composition root passes ports and the module stays one unit to copy.
 * It is given no repository: a use case reaches one only inside the unit of work (ADR 0055). The last
 * route is the module's public one, behind `publicRoute` instead of the tenant guard (ADR 0059).
 */
export function registerCustomerRoutes(
  router: HttpRouter,
  { session, membership, publicSurface, unitOfWork, clock, ids }: CustomerRoutesDeps
): void {
  router.get(base, new ListCustomersController(session, membership, new ListCustomersService(unitOfWork)).handle)
  router.post(
    base,
    new CreateCustomerController(session, membership, new CreateCustomerService(unitOfWork, clock, ids)).handle
  )
  router.get(
    `${base}/:customerId`,
    new GetCustomerController(session, membership, new GetCustomerService(unitOfWork)).handle
  )
  router.put(
    `${base}/:customerId`,
    new UpdateCustomerController(session, membership, new UpdateCustomerService(unitOfWork, clock, ids)).handle
  )
  router.post(
    `${base}/:customerId/archive`,
    new ArchiveCustomerController(session, membership, new ArchiveCustomerService(unitOfWork, clock, ids)).handle
  )
  router.post(
    `${base}/:customerId/restore`,
    new RestoreCustomerController(session, membership, new RestoreCustomerService(unitOfWork, clock, ids)).handle
  )
  router.delete(
    `${base}/:customerId`,
    new DeleteCustomerController(session, membership, new DeleteCustomerService(unitOfWork, clock, ids)).handle
  )
  router.post(
    `${publicBase}/customer-registrations`,
    new RegisterCustomerController(publicSurface, new RegisterCustomerService(unitOfWork, clock, ids)).handle
  )
}
