import * as z from 'zod/mini'
import { planKeySchema, subscriptionAccesses, subscriptionSchema, subscriptionStatuses } from './billing'
import { currencySchema } from './money'
import { type Permissions, statements } from './organizations'
import { instantSchema, timeZoneSchema } from './time'

/**
 * The operator back office (ADR 0077): what the people who run the SaaS read of every organization and
 * user, and their read-only visits to an organization as its owner sees it. Every route is under
 * `/api/admin/`, and answers 404 to anyone who is not an active operator.
 */

/** Rows per page of the back office's lists. */
export const backOfficePageSize = 20

/** How long an impersonation lasts, and how old an operator's session may be to open the back office. */
export const backOfficeLimits = { impersonationMinutes: 30, sessionHours: 12 } as const

/**
 * What an impersonated member holds: the `read` action of every resource that has one, and nothing else, so
 * the screens hide every write and the permission checks refuse it (ADR 0077).
 */
export const impersonationPermissions = /* @__PURE__ */ Object.fromEntries(
  Object.entries(statements).flatMap(([resource, actions]) =>
    (actions as readonly string[]).includes('read') ? [[resource, ['read']]] : []
  )
) as Permissions

/** The codes of the back office's own refusals; the web says each one. */
export const backOfficeProblems = {
  /** An operator whose session may not open the back office: `reason` says why. */
  sessionRefused: 'operator_session_refused',
  /** An operator who is inside another organization already. */
  impersonationActive: 'impersonation_active',
  /** A write from an operator inside an organization, which is read only. */
  readOnly: 'impersonation_read_only'
} as const

/** `GET /api/admin/organizations?search=&page=` and `GET /api/admin/users?search=&page=`. */
export const backOfficeListQuerySchema = z.strictObject({
  search: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(200))),
  page: z._default(z.pipe(z.coerce.number(), z.int().check(z.minimum(1))), 1)
})

export type BackOfficeListQuery = z.infer<typeof backOfficeListQuerySchema>

const personSchema = z.object({ id: z.string(), name: z.string(), email: z.string() })

/** One organization in the back office's list. `owner` is the oldest owner, `null` only while it is created. */
export const backOfficeOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: instantSchema,
  subscription: z.object({
    status: z.enum(subscriptionStatuses),
    access: z.enum(subscriptionAccesses),
    plan: z.nullable(planKeySchema)
  }),
  owner: z.nullable(personSchema),
  members: z.int().check(z.minimum(0))
})

export type BackOfficeOrganization = z.infer<typeof backOfficeOrganizationSchema>

const pageOf = <Item extends z.ZodMiniType>(item: Item) =>
  z.object({
    items: z.array(item),
    total: z.int().check(z.minimum(0)),
    page: z.int().check(z.minimum(1)),
    pageSize: z.int().check(z.minimum(1))
  })

export const backOfficeOrganizationPageSchema = pageOf(backOfficeOrganizationSchema)

export type BackOfficeOrganizationPage = z.infer<typeof backOfficeOrganizationPageSchema>

/** `GET /api/admin/organizations/:organizationId`: its state, its members, and whoever is inside it now. */
export const backOfficeOrganizationDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: instantSchema,
  timeZone: timeZoneSchema,
  currency: currencySchema,
  subscription: subscriptionSchema,
  members: z.array(
    z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.string(), joinedAt: instantSchema })
  )
})

export type BackOfficeOrganizationDetail = z.infer<typeof backOfficeOrganizationDetailSchema>

/** One user in the back office's list. `lastSignInAt` is the newest live session's start, `null` with none. */
export const backOfficeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: instantSchema,
  lastSignInAt: z.nullable(instantSchema),
  twoFactor: z.boolean(),
  organizations: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string(), role: z.string() }))
})

export type BackOfficeUser = z.infer<typeof backOfficeUserSchema>

export const backOfficeUserPageSchema = pageOf(backOfficeUserSchema)

export type BackOfficeUserPage = z.infer<typeof backOfficeUserPageSchema>
