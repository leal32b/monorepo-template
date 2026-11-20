import { logoLimits, type OrganizationLogo } from '@repo/contracts'
import type { Image } from '#libs/files/image'
import type { FileStorage } from '#libs/ports/file-storage.port'
import { logoKey } from '#libs/storage/keys'
import {
  LogoDimensionsException,
  LogoTooLargeException,
  LogoTypeUnsupportedException
} from './organization-logo.errors'

/**
 * An organization's logo (ADR 0076), without its bytes, which are in the store at `logos/<organization>/<id>`:
 * what the API found in them, and who set it when. One per organization; a new one has a new id.
 */
export type LogoRecord = {
  id: string
  organizationId: string
  type: Image['type']
  width: number
  height: number
  /** In bytes. */
  size: number
  updatedBy: string
  updatedAt: Date
}

/** How long an upload's address lives: enough to send 1 MiB on a slow line, too short to share. */
export const UPLOAD_SECONDS = 5 * 60

/** The image as the store keeps it: a new id per logo, so a browser may keep each for a day without asking. */
export const LOGO_CACHE_CONTROL = 'private, max-age=86400, immutable'

/** The size the store says an upload has, held to the limit before its bytes are read. */
export function assertSize(size: number): void {
  if (size > logoLimits.maxBytes) throw new LogoTooLargeException()
}

/** The image its bytes are, held to the types and sides a logo may have; `null` is no image at all. */
export function assertLogo(image: Image | null): Image {
  if (image === null) throw new LogoTypeUnsupportedException()
  const sides = [image.width, image.height]
  if (sides.some((side) => side < logoLimits.minSide || side > logoLimits.maxSide)) {
    throw new LogoDimensionsException()
  }
  return image
}

const day = 24 * 60 * 60 * 1000

/**
 * The logo as the web draws it: an address signed at the start of the UTC day, for 2 days, so it is the
 * same all day for every member and a browser keeps the image, and any address handed out lives at least a
 * day. Removing the logo deletes the object, which ends every address at once.
 */
export async function logoOf(storage: FileStorage, record: LogoRecord, now: Date): Promise<OrganizationLogo> {
  const signedAt = new Date(Math.floor(now.getTime() / day) * day)
  const url = await storage.signDownload(logoKey(record.organizationId, record.id), {
    signedAt,
    expiresInSeconds: (2 * day) / 1000
  })
  return { url, width: record.width, height: record.height }
}
