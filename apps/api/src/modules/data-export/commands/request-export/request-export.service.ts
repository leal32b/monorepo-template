import type { OrganizationExport } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { DataExportUnitOfWork } from '../../data-export-unit-of-work.port'
import { buildExport } from '../../jobs/data-export-jobs'
import { assertCanRequest, newExport, stateOf } from '../../organization-export'

/**
 * The owner asks for the organization's data (ADR 0074): one request every 15 minutes, which replaces the
 * last export and its file, records who asked, and enqueues the build, all or nothing (ADR 0052).
 */
export class RequestExportService {
  constructor(
    private readonly unitOfWork: DataExportUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, actor: Extract<AuditActor, { kind: 'member' }>): Promise<OrganizationExport> {
    const now = this.clock.now()
    const record = newExport({ id: this.ids.generate(), organizationId, requestedBy: actor.id, now })
    const entryId = this.ids.generate()
    await this.unitOfWork.run(organizationId, async ({ exports, audit, jobs }) => {
      assertCanRequest(await exports.find(organizationId), now)
      await exports.replace(record)
      await audit.record({
        id: entryId,
        organizationId,
        at: now,
        actor,
        resourceType: 'organization',
        resourceId: organizationId,
        action: 'export-requested',
        fields: []
      })
      await jobs.enqueue(buildExport, { organizationId, exportId: record.id })
    })
    return stateOf(record, now)
  }
}
