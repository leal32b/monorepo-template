import { createHmac } from 'node:crypto'
import type { StorageConfig } from '#config/env'
import { LocalFileStorage } from '#libs/adapters/local-file-storage'
import { S3FileStorage } from '#libs/adapters/s3-file-storage'
import type { Clock } from '#libs/ports/clock.port'
import type { FileStorage } from '#libs/ports/file-storage.port'

/**
 * The store the configuration picks (ADR 0076): the S3-compatible one when it is configured, the local
 * folder otherwise, whose addresses are signed with a key derived from Better Auth's secret, so they survive
 * a restart and no other secret is needed in development.
 */
export function createFileStorage(config: StorageConfig, { clock, authSecret }: { clock: Clock; authSecret: string }) {
  if (config.kind === 's3') {
    const { endpoint, bucket, region, accessKeyId, secretAccessKey } = config
    return new S3FileStorage({ endpoint, bucket, region, accessKeyId, secretAccessKey, clock }) satisfies FileStorage
  }
  const secret = createHmac('sha256', authSecret).update('local-file-storage').digest('hex')
  return new LocalFileStorage({ root: config.dir, secret, clock }) satisfies FileStorage
}
