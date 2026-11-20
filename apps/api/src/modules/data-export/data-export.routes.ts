import type { Logger } from 'pino'
import type { HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { type TenantGuard, tenantRoutes } from '#modules/identity/index'
import { RequestExportService } from './commands/request-export/request-export.service'
import type { DataExportUnitOfWork } from './data-export-unit-of-work.port'
import { DownloadExportService } from './queries/download-export/download-export.service'
import { GetExportService } from './queries/get-export/get-export.service'

export type DataExportRoutesDeps = TenantGuard & {
  unitOfWork: DataExportUnitOfWork
  clock: Clock
  ids: IdGenerator
  logger: Logger
}

const base = '/api/organizations/:organizationId/export'

/** Only the owner holds it (ADR 0074): the whole organization's data. */
const permission = { organization: ['export'] } as const

/**
 * The organization export's routes (ADR 0074), the owner's alone: its state, a request, and the file. A
 * request stays open while the organization is read only: taking its data out is never behind a payment.
 */
export function registerDataExportRoutes(router: HttpRouter, deps: DataExportRoutesDeps): void {
  const { unitOfWork, clock, ids, logger } = deps
  const get = new GetExportService(unitOfWork, clock)
  const request = new RequestExportService(unitOfWork, clock, ids)
  const download = new DownloadExportService(unitOfWork, clock, logger)
  const tenant = tenantRoutes(router, deps)
  tenant.get(base, { permission }, ({ organizationId }) => get.execute(organizationId))
  tenant.post(base, { permission, status: 202, duringReadOnly: true }, ({ organizationId, actor }) =>
    request.execute(organizationId, actor)
  )
  tenant.get(`${base}/file`, { permission }, ({ organizationId, actor }) => download.execute(organizationId, actor))
}
