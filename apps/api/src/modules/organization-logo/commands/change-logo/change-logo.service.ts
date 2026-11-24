import type { LogoInput, OrganizationLogo } from '@repo/contracts'
import { imageOf } from '#libs/files/image'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { deleteFiles } from '#libs/storage/delete-files'
import { logoKey, uploadKey } from '#libs/storage/keys'
import { assertLogo, assertSize, LOGO_CACHE_CONTROL, type LogoRecord, logoOf } from '../../logo'
import { LogoUploadMissingException } from '../../organization-logo.errors'
import type { OrganizationLogoUnitOfWork } from '../../organization-logo-unit-of-work.port'

/**
 * Makes an upload the organization's logo (ADR 0076): the upload is looked for under the organization the
 * guard confirmed, held to the size limit by the store's word, then to the types and sides by its own bytes;
 * the API writes those bytes to the logo's key with the type it found, then, in one unit of work, keeps the
 * logo, records who changed it, and enqueues the deletion of the upload and of the logo it replaced.
 */
export class ChangeLogoService {
  constructor(
    private readonly deps: {
      unitOfWork: OrganizationLogoUnitOfWork
      storage: FileStorage
      clock: Clock
      ids: IdGenerator
    }
  ) {}

  async execute(
    organizationId: string,
    { uploadId }: LogoInput,
    actor: Extract<AuditActor, { kind: 'member' }>
  ): Promise<OrganizationLogo> {
    const { unitOfWork, storage, clock, ids } = this.deps
    const upload = uploadKey(organizationId, uploadId)
    const stored = await storage.stat(upload)
    if (stored === null) throw new LogoUploadMissingException()
    assertSize(stored.size)
    const bytes = await storage.read(upload)
    if (bytes === null) throw new LogoUploadMissingException()
    const image = assertLogo(imageOf(bytes))
    const now = clock.now()
    const record: LogoRecord = {
      id: ids.generate(),
      organizationId,
      ...image,
      size: bytes.length,
      updatedBy: actor.id,
      updatedAt: now
    }
    const key = logoKey(organizationId, record.id)
    await storage.write(key, bytes, { type: image.type, cacheControl: LOGO_CACHE_CONTROL })
    const entryId = ids.generate()
    try {
      await unitOfWork.run(organizationId, async ({ logos, audit, jobs }) => {
        const previous = await logos.find(organizationId)
        await logos.save(record)
        await audit.record({
          id: entryId,
          organizationId,
          at: now,
          actor,
          resourceType: 'organization',
          resourceId: organizationId,
          action: 'logo-changed',
          fields: []
        })
        const freed = previous === null ? [upload] : [upload, logoKey(organizationId, previous.id)]
        await jobs.enqueue(deleteFiles, { keys: freed })
      })
    } catch (error) {
      // Nothing points at the new image: it goes now, and the upload stays for another try.
      await storage.delete(key)
      throw error
    }
    return logoOf(storage, record, now)
  }
}
