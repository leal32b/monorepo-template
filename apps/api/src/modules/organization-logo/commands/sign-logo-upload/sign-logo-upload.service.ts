import type { LogoUploadInput, SignedUpload } from '@repo/contracts'
import type { FileStorage } from '#libs/ports/file-storage.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { RateLimit, RateLimiter } from '#libs/ports/rate-limiter.port'
import { uploadKey } from '#libs/storage/keys'
import { UPLOAD_SECONDS } from '../../logo'
import { LogoUploadsTooManyException } from '../../organization-logo.errors'

/** Uploads an organization may sign in an hour (ADR 0076): a few tries of a logo, not a way to fill the bucket. */
export const logoUploadLimit: RateLimit = { name: 'logo-upload', max: 20, windowSeconds: 60 * 60 }

/**
 * An address the browser `PUT`s a logo to, straight to the store (ADR 0076): under the organization the
 * guard confirmed, for the type and size the contract allowed, both in the signature, for 5 minutes. Nothing
 * is kept until the upload is confirmed; an upload never confirmed is deleted by the bucket after a day.
 */
export class SignLogoUploadService {
  constructor(private readonly deps: { storage: FileStorage; limiter: RateLimiter; ids: IdGenerator }) {}

  async execute(organizationId: string, { type, size }: LogoUploadInput): Promise<SignedUpload> {
    const { storage, limiter, ids } = this.deps
    if (!(await limiter.hit(logoUploadLimit, organizationId)).allowed) throw new LogoUploadsTooManyException()
    const uploadId = ids.generate()
    const upload = await storage.signUpload(uploadKey(organizationId, uploadId), {
      type,
      size,
      expiresInSeconds: UPLOAD_SECONDS
    })
    return { uploadId, url: upload.url, headers: upload.headers, expiresAt: upload.expiresAt.toISOString() }
  }
}
