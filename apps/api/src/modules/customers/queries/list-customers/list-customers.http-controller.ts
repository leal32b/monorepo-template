import { listCustomersQuerySchema } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import { readValidQuery } from '#libs/http/query'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { ListCustomersService } from './list-customers.service'

/** `GET /api/organizations/:organizationId/customers?status=&search=&page=` */
export class ListCustomersController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: ListCustomersService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['read']
    })
    sendJson(res, 200, await this.service.execute(organizationId, readValidQuery(req, listCustomersQuerySchema)))
  }
}
