import * as z from 'zod/mini'
import { instantSchema } from './time'

/**
 * The organization export's numbers (ADR 0074): one request per organization every `everyMinutes`, and a
 * file kept `keepDays` after it is ready, then emptied by the daily purge.
 */
export const exportLimits = { everyMinutes: 15, keepDays: 7 } as const

/** Why an export route refused (ADR 0074). */
export const exportProblems = {
  /** The last request is younger than `exportLimits.everyMinutes`: read the state, which says when. */
  tooSoon: 'export_too_soon',
  /** No file to download: none was asked for, it is not ready yet, or it expired. */
  notFound: 'export_not_found'
} as const

/** When the owner may ask again; `null` means now. */
const nextRequestAt = z.nullable(instantSchema)

/**
 * `GET /api/organizations/:organizationId/export`, and the answer of `POST` to it (ADR 0074): the
 * organization's last export, never its file. `pending` is being prepared; `ready` downloads until
 * `expiresAt`; `expired` has no file any more. The file is `GET …/export/file`.
 */
export const organizationExportSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('none') }),
  z.object({ status: z.literal('pending'), requestedAt: instantSchema, nextRequestAt }),
  z.object({
    status: z.literal('ready'),
    requestedAt: instantSchema,
    expiresAt: instantSchema,
    /** In bytes. */
    size: z.number().check(z.int(), z.nonnegative()),
    nextRequestAt
  }),
  z.object({ status: z.literal('expired'), requestedAt: instantSchema, expiresAt: instantSchema, nextRequestAt })
])

export type OrganizationExport = z.infer<typeof organizationExportSchema>
