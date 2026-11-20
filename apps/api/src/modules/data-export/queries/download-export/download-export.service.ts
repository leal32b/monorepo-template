import type { Logger } from 'pino'
import { FileRedirect } from '#libs/http/file'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import { exportKey } from '#libs/storage/keys'
import type { DataExportUnitOfWork } from '../../data-export-unit-of-work.port'
import { downloadable } from '../../organization-export'

/** How long the store's address of an export lives: the browser follows it at once. */
const DOWNLOAD_SECONDS = 5 * 60

/**
 * The zip of the organization's last export, while it is ready (ADR 0074), at an address of the store signed
 * for 5 minutes that names it as an attachment (ADR 0076): the route behind the guard stays the only way in.
 * A `GET` writes nothing, so the download is not in the audit trail: an `export downloaded` line names the
 * organization, the export and the member instead.
 */
export class DownloadExportService {
  constructor(
    private readonly deps: { unitOfWork: DataExportUnitOfWork; storage: FileStorage; clock: Clock; logger: Logger }
  ) {}

  async execute(organizationId: string, actor: Extract<AuditActor, { kind: 'member' }>): Promise<FileRedirect> {
    const { unitOfWork, storage, clock, logger } = this.deps
    const now = clock.now()
    const record = downloadable(
      await unitOfWork.run(organizationId, ({ exports }) => exports.find(organizationId)),
      now
    )
    const day = record.requestedAt.toISOString().slice(0, 10)
    const url = await storage.signDownload(exportKey(organizationId, record.id), {
      signedAt: now,
      expiresInSeconds: DOWNLOAD_SECONDS,
      fileName: `organization-export-${day}.zip`
    })
    logger.info({ organizationId, exportId: record.id, actorId: actor.id }, 'export downloaded')
    return new FileRedirect(url)
  }
}
