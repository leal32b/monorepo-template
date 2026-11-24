import { toCsv } from '#libs/archive/csv'
import { zip } from '#libs/archive/zip'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import { deleteFiles } from '#libs/storage/delete-files'
import { exportKey } from '#libs/storage/keys'
import type { DataExportUnitOfWork } from '../../data-export-unit-of-work.port'
import { dataExportEmails, exportReadyEmail } from '../../emails/data-export-emails'
import type { OrganizationDirectory } from '../../organization-directory.port'
import { readied } from '../../organization-export'

/** Which export the job builds: the organization's, by the id its request gave it. */
export type BuildExport = { organizationId: string; exportId: string }

/**
 * Builds the export a request asked for (ADR 0074): the plugin's tables, read on the pool, then the tenant
 * tables, read in a unit of work as `app_tenant`; then a zip of one CSV each, built outside any transaction
 * and written to the store (ADR 0076); then, in one more, the export marked ready, the email to the owner who
 * asked, and the file's deletion at its expiry. An export that is no longer the organization's last one, or is
 * ready already, is left alone, so a retry or a late run changes nothing, and its file just written goes.
 */
export class BuildExportService {
  constructor(
    private readonly deps: {
      unitOfWork: DataExportUnitOfWork
      directory: OrganizationDirectory
      storage: FileStorage
      clock: Clock
      webOrigin: string
    }
  ) {}

  async execute({ organizationId, exportId }: BuildExport): Promise<void> {
    const { unitOfWork, directory, storage, clock, webOrigin } = this.deps
    const record = await unitOfWork.run(organizationId, ({ exports }) => exports.find(organizationId))
    if (record?.id !== exportId || record.readyAt !== null) return
    const plugin = await directory.read(organizationId, record.requestedBy)
    if (plugin === null) return
    const tenant = await unitOfWork.run(organizationId, ({ records }) => records.tables(organizationId))
    const now = clock.now()
    const file = zip(
      [...plugin.tables, ...tenant].map(({ name, columns, rows }) => ({
        name: `${name}.csv`,
        content: toCsv(columns, rows)
      })),
      now
    )
    const ready = readied(record, { now, size: file.length })
    const expiresAt = ready.expiresAt as Date
    const key = exportKey(organizationId, exportId)
    await storage.write(key, file, { type: 'application/zip' })
    const saved = await unitOfWork.run(organizationId, async ({ exports, jobs }) => {
      if (!(await exports.complete(ready))) return false
      await jobs.enqueue(deleteFiles, { keys: [key] }, { runAt: expiresAt })
      if (plugin.requester !== null) {
        await jobs.enqueue(
          dataExportEmails.job,
          exportReadyEmail(plugin.requester, plugin.organization, expiresAt, webOrigin)
        )
      }
      return true
    })
    if (!saved) await storage.delete(key)
  }
}
