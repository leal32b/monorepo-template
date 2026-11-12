import * as z from 'zod/mini'
import { instantSchema } from './time'

/**
 * The audit trail of an organization (ADR 0061). Each resource lists the actions its module records,
 * as stable codes: the API stores them, the web says each pair in its languages. A module adds its
 * resource here, with the actions it records.
 */
export const auditActions = {
  customer: ['created', 'updated', 'archived', 'restored', 'deleted']
} as const

export type AuditResourceType = keyof typeof auditActions

export type AuditAction<R extends AuditResourceType = AuditResourceType> = (typeof auditActions)[R][number]

const resourceTypes = Object.keys(auditActions) as [AuditResourceType, ...AuditResourceType[]]
const actions = [...new Set(Object.values(auditActions).flat())] as [AuditAction, ...AuditAction[]]

/** Entries per page of the trail. */
export const auditPageSize = 25

/**
 * Who made a change: a member, by id, with their name while they are still a member (`null` once
 * they left or deleted their account); a visitor of the public surface; or the system, such as a job.
 */
export const auditActorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('member'), id: z.string(), name: z.nullable(z.string()) }),
  z.object({ kind: z.literal('visitor') }),
  z.object({ kind: z.literal('system') })
])

export type AuditActor = z.infer<typeof auditActorSchema>

/**
 * One entry of the trail, as the API returns it: who did what to which record, and when, with the
 * names of the fields the change set. Never a value (ADR 0061).
 */
export const auditEntrySchema = z.object({
  id: z.string(),
  at: instantSchema,
  actor: auditActorSchema,
  resource: z.object({ type: z.enum(resourceTypes), id: z.string() }),
  action: z.enum(actions),
  fields: z.array(z.string())
})

export type AuditEntry = z.infer<typeof auditEntrySchema>

/**
 * `GET /api/organizations/:organizationId/audit-entries`: a page of the trail, newest first. `next`
 * is where the next, older page starts, opaque to the web, or `null` at the end. There is no total:
 * the trail grows without end, and it pages by keyset (ADR 0061).
 */
export const auditEntryPageSchema = z.object({
  items: z.array(auditEntrySchema),
  next: z.nullable(z.string())
})

export type AuditEntryPage = z.infer<typeof auditEntryPageSchema>

/** `?before=`: the `next` of the page before; left out for the newest page. */
export const listAuditEntriesQuerySchema = z.strictObject({
  before: z.optional(z.string().check(z.minLength(1), z.maxLength(200)))
})
