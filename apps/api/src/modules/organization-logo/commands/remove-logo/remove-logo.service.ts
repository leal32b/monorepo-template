import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { deleteFiles } from '#libs/storage/delete-files'
import { logoKey } from '#libs/storage/keys'
import type { OrganizationLogoUnitOfWork } from '../../organization-logo-unit-of-work.port'

/**
 * Removes the organization's logo (ADR 0076): the row, an entry saying who, and the deletion of its image,
 * enqueued in the same unit of work, so the image goes only if the row did. Removing none is no change.
 */
export class RemoveLogoService {
  constructor(private readonly deps: { unitOfWork: OrganizationLogoUnitOfWork; clock: Clock; ids: IdGenerator }) {}

  async execute(organizationId: string, actor: Extract<AuditActor, { kind: 'member' }>): Promise<void> {
    const { unitOfWork, clock, ids } = this.deps
    await unitOfWork.run(organizationId, async ({ logos, audit, jobs }) => {
      const logo = await logos.find(organizationId)
      if (logo === null) return
      await logos.remove(organizationId)
      await audit.record({
        id: ids.generate(),
        organizationId,
        at: clock.now(),
        actor,
        resourceType: 'organization',
        resourceId: organizationId,
        action: 'logo-removed',
        fields: []
      })
      await jobs.enqueue(deleteFiles, { keys: [logoKey(organizationId, logo.id)] })
    })
  }
}
