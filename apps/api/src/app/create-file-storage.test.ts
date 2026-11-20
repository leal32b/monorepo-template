import { FixedClock } from '#libs/adapters/fixed-clock'
import { LocalFileStorage } from '#libs/adapters/local-file-storage'
import { S3FileStorage } from '#libs/adapters/s3-file-storage'
import { createFileStorage } from './create-file-storage'

const deps = { clock: new FixedClock(new Date('2026-11-20T12:00:00Z')), authSecret: 'a'.repeat(32) }

describe('createFileStorage (ADR 0076)', () => {
  it('keeps files in a local folder when no store is configured, with addresses that survive a restart', async () => {
    const options = { signedAt: new Date('2026-11-20T00:00:00Z'), expiresInSeconds: 60 }
    const storage = createFileStorage({ kind: 'local', dir: '.storage' }, deps)
    const again = createFileStorage({ kind: 'local', dir: '.storage' }, deps)
    const other = createFileStorage({ kind: 'local', dir: '.storage' }, { ...deps, authSecret: 'b'.repeat(32) })

    expect(storage).toBeInstanceOf(LocalFileStorage)
    expect(await again.signDownload('logos/org-1/l-1', options)).toBe(
      await storage.signDownload('logos/org-1/l-1', options)
    )
    expect(await other.signDownload('logos/org-1/l-1', options)).not.toBe(
      await storage.signDownload('logos/org-1/l-1', options)
    )
  })

  it('speaks to an S3-compatible store when one is configured', async () => {
    const storage = createFileStorage(
      {
        kind: 's3',
        endpoint: 'https://account.r2.cloudflarestorage.com',
        bucket: 'files',
        region: 'auto',
        accessKeyId: 'key-id',
        secretAccessKey: 'secret'
      },
      deps
    )

    expect(storage).toBeInstanceOf(S3FileStorage)
    expect(await storage.signDownload('logos/org-1/l-1', { signedAt: new Date(), expiresInSeconds: 60 })).toMatch(
      /^https:\/\/account\.r2\.cloudflarestorage\.com\/files\/logos\/org-1\/l-1\?/
    )
  })
})
