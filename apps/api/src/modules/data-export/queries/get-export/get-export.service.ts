import type { OrganizationExport } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { DataExportUnitOfWork } from '../../data-export-unit-of-work.port'
import { stateOf } from '../../organization-export'

/** The organization's last export as the settings page reads it (ADR 0074), never its file. */
export class GetExportService {
  constructor(
    private readonly unitOfWork: DataExportUnitOfWork,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string): Promise<OrganizationExport> {
    const record = await this.unitOfWork.run(organizationId, ({ exports }) => exports.find(organizationId))
    return stateOf(record, this.clock.now())
  }
}
