import { customerInputSchema } from '@repo/contracts'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { CreateCustomerService } from './create-customer.service'

/** `POST /api/organizations/:organizationId/customers`: 201 with the customer. */
export class CreateCustomerController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: CreateCustomerService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['create']
    })
    sendJson(res, 201, await this.service.execute(organizationId, await readValidJson(req, customerInputSchema)))
  }
}
