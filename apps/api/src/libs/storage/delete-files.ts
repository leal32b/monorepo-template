import type { Logger } from 'pino'
import * as z from 'zod/mini'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { JobDefinition, JobQueue, JobRegistrar } from '#libs/ports/job-queue.port'
import { isKey, organizationPrefixes } from './keys'

const key = z.string().check(z.refine(isKey))

/**
 * Files to delete from the store (ADR 0076), enqueued in the transaction of the change that frees them (a
 * logo replaced or removed, an export replaced), or for later (an export at its expiry). Deleting a missing
 * key succeeds, so a retry is harmless; a store that is down delays a deletion, never a request.
 */
export const deleteFiles: JobDefinition<{ keys: string[] }> = {
  kind: 'storage.delete-files',
  schema: z.object({ keys: z.array(key).check(z.minLength(1)) })
}

/** Every file of an organization, deleted with it: its three prefixes. */
export const deleteOrganizationFiles: JobDefinition<{ organizationId: string }> = {
  kind: 'storage.delete-organization',
  schema: z.object({ organizationId: z.string().check(z.regex(/^[\w-]+$/)) })
}

/** The store's job kinds, registered by the composition root with the store the configuration picked. */
export function registerStorageJobs(
  registrar: JobRegistrar,
  { storage, logger }: { storage: FileStorage; logger: Logger }
) {
  registrar.register(deleteFiles, async ({ keys }) => {
    for (const each of keys) await storage.delete(each)
  })
  registrar.register(deleteOrganizationFiles, async ({ organizationId }) => {
    let deleted = 0
    for (const prefix of organizationPrefixes(organizationId)) deleted += await storage.deletePrefix(prefix)
    logger.info({ organizationId, deleted }, 'organization files deleted')
  })
}

/**
 * What the store does right before organizations are deleted (identity's `OrganizationDeletionListener`,
 * ADR 0067): it enqueues the deletion of their files, which runs after the rows are gone.
 */
export class StorageOrganizationDeletion {
  constructor(private readonly jobs: JobQueue) {}

  async beforeDelete(organizationIds: readonly string[]): Promise<void> {
    for (const organizationId of organizationIds) await this.jobs.enqueue(deleteOrganizationFiles, { organizationId })
  }
}
