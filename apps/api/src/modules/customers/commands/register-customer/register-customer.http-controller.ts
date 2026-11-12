import { type PublicCustomerRegistration, publicCustomerRegistrationInputSchema } from '@repo/contracts'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import { type PublicSurface, publicLimits, publicRoute } from '#modules/identity/index'
import type { RegisterCustomerService } from './register-customer.service'

const received: PublicCustomerRegistration = { received: true }

/**
 * `POST /api/public/organizations/:organizationSlug/customer-registrations`: 202, the request was
 * taken in (ADR 0059). The shape of a public write: `publicRoute` counts the request and resolves
 * the slug before the body is read; the answer is the same whatever the use case found; a filled
 * honeypot writes nothing, and only the log says so.
 */
export class RegisterCustomerController {
  readonly handle: HttpHandler

  constructor(surface: PublicSurface, service: RegisterCustomerService) {
    this.handle = publicRoute(surface, publicLimits.write, async (req, res, { organization, requestId }) => {
      const { referralCode, ...values } = await readValidJson(req, publicCustomerRegistrationInputSchema)
      if (referralCode) surface.logger.info({ reqId: requestId, reason: 'honeypot' }, 'public write ignored')
      else await service.execute(organization.id, values)
      sendJson(res, 202, received)
    })
  }
}
