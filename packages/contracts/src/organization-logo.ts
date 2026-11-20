import * as z from 'zod/mini'
import { instantSchema } from './time'

/**
 * What an organization's logo may be (ADR 0076): a PNG, JPEG or WebP (no SVG, which can carry script) of at
 * most 1 MiB, each side from 64 to 4096 pixels. The API checks each on the file's bytes.
 */
export const logoLimits = {
  types: ['image/png', 'image/jpeg', 'image/webp'],
  maxBytes: 1_048_576,
  minSide: 64,
  maxSide: 4096
} as const

export type LogoType = (typeof logoLimits.types)[number]

/** Why a logo route refused (ADR 0076). */
export const logoProblems = {
  /** No upload under that id for this organization: it was never sent, failed, or expired. */
  uploadMissing: 'logo_upload_missing',
  tooLarge: 'logo_too_large',
  /** Its bytes are not a PNG, JPEG or WebP, whatever its name or the type it was sent with. */
  unsupportedType: 'logo_type_unsupported',
  /** A side under `logoLimits.minSide` or over `logoLimits.maxSide` pixels. */
  dimensions: 'logo_dimensions',
  /** More uploads signed for the organization than an hour allows. */
  tooManyUploads: 'logo_uploads_too_many'
} as const

/** `POST /api/organizations/:organizationId/logo/uploads`: the file the browser is about to send. */
export const logoUploadInputSchema = z.object({
  type: z.enum(logoLimits.types),
  size: z.number().check(z.int(), z.gte(1), z.lte(logoLimits.maxBytes))
})

export type LogoUploadInput = z.infer<typeof logoUploadInputSchema>

/**
 * Its answer: one `PUT` of the file to `url`, with `headers` as they are, before `expiresAt`; then the upload
 * id confirms it.
 */
export const signedUploadSchema = z.object({
  uploadId: z.string(),
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  expiresAt: instantSchema
})

export type SignedUpload = z.infer<typeof signedUploadSchema>

/** `PUT /api/organizations/:organizationId/logo`: the upload that becomes the logo. */
export const logoInputSchema = z.object({ uploadId: z.uuid() })

export type LogoInput = z.infer<typeof logoInputSchema>

/**
 * The logo as the web draws it, in the membership read and the answer of `PUT …/logo`: a signed address,
 * the same all day, and its size in pixels.
 */
export const organizationLogoSchema = z.object({
  url: z.string(),
  width: z.number().check(z.int(), z.positive()),
  height: z.number().check(z.int(), z.positive())
})

export type OrganizationLogo = z.infer<typeof organizationLogoSchema>
