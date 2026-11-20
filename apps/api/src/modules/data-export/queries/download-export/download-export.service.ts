import type { Logger } from 'pino'
import { FileDownload } from '#libs/http/file'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import { ExportNotFoundException } from '../../data-export.errors'
import type { DataExportUnitOfWork } from '../../data-export-unit-of-work.port'
import { downloadable } from '../../organization-export'

/**
 * The zip of the organization's last export, while it is ready (ADR 0074). A `GET` writes nothing, so the
 * download is not in the audit trail: an `export downloaded` line names the organization, the export and the
 * member instead.
 */
export class DownloadExportService {
  constructor(
    private readonly unitOfWork: DataExportUnitOfWork,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  async execute(organizationId: string, actor: Extract<AuditActor, { kind: 'member' }>): Promise<FileDownload> {
    const now = this.clock.now()
    const { record, file } = await this.unitOfWork.run(organizationId, async ({ exports }) => {
      const found = downloadable(await exports.find(organizationId), now)
      return { record: found, file: await exports.file(organizationId) }
    })
    if (file === null) throw new ExportNotFoundException()
    this.logger.info({ organizationId, exportId: record.id, actorId: actor.id }, 'export downloaded')
    const day = record.requestedAt.toISOString().slice(0, 10)
    return new FileDownload(`organization-export-${day}.zip`, 'application/zip', file)
  }
}
