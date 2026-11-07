import { customerInputSchema } from '@repo/contracts'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { UpdateCustomerService } from './update-customer.service'

/** `PUT /api/organizations/:organizationId/customers/:customerId`: the whole customer, again. */
export class UpdateCustomerController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: UpdateCustomerService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['update']
    })
    const values = await readValidJson(req, customerInputSchema)
    sendJson(res, 200, await this.service.execute(organizationId, params.customerId as string, values))
  }
}
