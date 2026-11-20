import * as z from 'zod/mini'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { JobDefinition, JobRegistrar } from '#libs/ports/job-queue.port'
import { type BuildExport, BuildExportService } from '../commands/build-export/build-export.service'
import type { DataExportUnitOfWork } from '../data-export-unit-of-work.port'
import type { OrganizationDirectory } from '../organization-directory.port'

/**
 * The build of an export (ADR 0074), enqueued with its request. Three attempts: a build that fails three
 * times fails the same way again (an organization too large for one job), and the owner asks again after 15
 * minutes.
 */
export const buildExport: JobDefinition<BuildExport> = {
  kind: 'data-export.build',
  schema: z.object({ organizationId: z.string(), exportId: z.string() }),
  maxAttempts: 3
}

export type DataExportJobsDeps = {
  unitOfWork: DataExportUnitOfWork
  directory: OrganizationDirectory
  /** Where the zip is written (ADR 0076). */
  storage: FileStorage
  clock: Clock
  /** The web origin the email's button opens. */
  webOrigin: string
}

/** The module's job kind, registered by the composition root with the ports it needs. */
export function registerDataExportJobs(registrar: JobRegistrar, deps: DataExportJobsDeps): void {
  const build = new BuildExportService(deps)
  registrar.register(buildExport, (payload) => build.execute(payload))
}
