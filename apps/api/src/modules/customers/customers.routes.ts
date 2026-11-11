import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { ArchiveCustomerController } from './commands/archive-customer/archive-customer.http-controller'
import { ArchiveCustomerService } from './commands/archive-customer/archive-customer.service'
import { CreateCustomerController } from './commands/create-customer/create-customer.http-controller'
import { CreateCustomerService } from './commands/create-customer/create-customer.service'
import { DeleteCustomerController } from './commands/delete-customer/delete-customer.http-controller'
import { DeleteCustomerService } from './commands/delete-customer/delete-customer.service'
import { RestoreCustomerController } from './commands/restore-customer/restore-customer.http-controller'
import { RestoreCustomerService } from './commands/restore-customer/restore-customer.service'
import { UpdateCustomerController } from './commands/update-customer/update-customer.http-controller'
import { UpdateCustomerService } from './commands/update-customer/update-customer.service'
import type { CustomerRepository } from './customer-repository.port'
import type { CustomersUnitOfWork } from './customers-unit-of-work.port'
import { GetCustomerController } from './queries/get-customer/get-customer.http-controller'
import { GetCustomerService } from './queries/get-customer/get-customer.service'
import { ListCustomersController } from './queries/list-customers/list-customers.http-controller'
import { ListCustomersService } from './queries/list-customers/list-customers.service'

export type CustomerRoutesDeps = {
  session: CurrentSession
  membership: Membership
  repository: CustomerRepository
  /** For the use cases with more than one write (ADR 0052). */
  unitOfWork: CustomersUnitOfWork
  clock: Clock
  ids: IdGenerator
}

const base = '/api/organizations/:organizationId/customers'

/**
 * The module's routes, each behind the tenant guard (ADR 0033): the module builds its use cases from
 * the ports it is given, so the composition root passes ports and the module stays one unit to copy.
 */
export function registerCustomerRoutes(
  router: HttpRouter,
  { session, membership, repository, unitOfWork, clock, ids }: CustomerRoutesDeps
): void {
  router.get(base, new ListCustomersController(session, membership, new ListCustomersService(repository)).handle)
  router.post(
    base,
    new CreateCustomerController(session, membership, new CreateCustomerService(repository, clock, ids)).handle
  )
  router.get(
    `${base}/:customerId`,
    new GetCustomerController(session, membership, new GetCustomerService(repository)).handle
  )
  router.put(
    `${base}/:customerId`,
    new UpdateCustomerController(session, membership, new UpdateCustomerService(repository, clock)).handle
  )
  router.post(
    `${base}/:customerId/archive`,
    new ArchiveCustomerController(session, membership, new ArchiveCustomerService(repository, clock)).handle
  )
  router.post(
    `${base}/:customerId/restore`,
    new RestoreCustomerController(session, membership, new RestoreCustomerService(repository, clock)).handle
  )
  router.delete(
    `${base}/:customerId`,
    new DeleteCustomerController(session, membership, new DeleteCustomerService(unitOfWork, clock, ids)).handle
  )
}
