import type { OrganizationLogo } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import { logoOf } from '../../logo'
import type { OrganizationLogoUnitOfWork } from '../../organization-logo-unit-of-work.port'

/** The organization's logo as the web draws it, or `null` (ADR 0076): what the membership read carries. */
export class GetLogoService {
  constructor(private readonly deps: { unitOfWork: OrganizationLogoUnitOfWork; storage: FileStorage; clock: Clock }) {}

  async execute(organizationId: string): Promise<OrganizationLogo | null> {
    const { unitOfWork, storage, clock } = this.deps
    const record = await unitOfWork.run(organizationId, ({ logos }) => logos.find(organizationId))
    return record === null ? null : logoOf(storage, record, clock.now())
  }
}
