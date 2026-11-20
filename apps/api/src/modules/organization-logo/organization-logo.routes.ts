import { logoInputSchema, logoUploadInputSchema } from '@repo/contracts'
import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { RateLimiter } from '#libs/ports/rate-limiter.port'
import { type TenantGuard, tenantRoutes } from '#modules/identity/index'
import { ChangeLogoService } from './commands/change-logo/change-logo.service'
import { RemoveLogoService } from './commands/remove-logo/remove-logo.service'
import { SignLogoUploadService } from './commands/sign-logo-upload/sign-logo-upload.service'
import type { OrganizationLogoUnitOfWork } from './organization-logo-unit-of-work.port'

export type OrganizationLogoRoutesDeps = TenantGuard & {
  unitOfWork: OrganizationLogoUnitOfWork
  storage: FileStorage
  limiter: RateLimiter
  clock: Clock
  ids: IdGenerator
}

const base = '/api/organizations/:organizationId/logo'

/** Whoever may change the organization's name may change its logo (ADR 0076): owners and admins. */
const permission = { organization: ['update'] } as const

/**
 * The organization logo's routes (ADR 0076): sign an upload, confirm it as the logo, remove the logo. The
 * logo is read with the membership (`GET …/me`), so there is no `GET` here. Signing and confirming are
 * changes, refused while the organization is read only; removing is a `DELETE`, which stays open.
 */
export function registerOrganizationLogoRoutes(router: HttpRouter, deps: OrganizationLogoRoutesDeps): void {
  const sign = new SignLogoUploadService(deps)
  const change = new ChangeLogoService(deps)
  const remove = new RemoveLogoService(deps)
  const tenant = tenantRoutes(router, deps)
  tenant.post(
    `${base}/uploads`,
    { permission, input: logoUploadInputSchema, status: 201 },
    ({ organizationId, input }) => sign.execute(organizationId, input)
  )
  tenant.put(base, { permission, input: logoInputSchema }, ({ organizationId, input, actor }) =>
    change.execute(organizationId, input, actor)
  )
  tenant.delete(base, { permission }, ({ organizationId, actor }) => remove.execute(organizationId, actor))
}
