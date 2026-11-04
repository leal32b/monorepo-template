import * as z from 'zod/mini'

/**
 * What can be done in an organization: resources and their actions (ADR 0033). They stay in code;
 * identity builds Better Auth's access control from them, and a product adds its resources here.
 * `ac` is the plugin's own resource for managing roles.
 */
export const statements = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  ac: ['create', 'read', 'update', 'delete']
} as const

export type Resource = keyof typeof statements
export type Action<R extends Resource = Resource> = (typeof statements)[R][number]

/** A set of permissions: for each resource, the actions held. */
export type Permissions = { [R in Resource]?: readonly Action<R>[] | undefined }

const resources = Object.keys(statements) as Resource[]

const actionsOf = <const A extends readonly [string, ...string[]]>(actions: A) => z.optional(z.array(z.enum(actions)))

/** A `Permissions` object: known resources only, each with actions of that resource. */
export const permissionsSchema = z.strictObject({
  organization: actionsOf(statements.organization),
  member: actionsOf(statements.member),
  invitation: actionsOf(statements.invitation),
  ac: actionsOf(statements.ac)
})

/**
 * `GET /api/organizations/:organizationId/me`: the caller's place in the organization. `permissions`
 * is what their roles resolve to, so the web never infers rights from a role name (ADR 0033).
 */
export const organizationMembershipSchema = z.object({
  roles: z.array(z.string()).check(z.minLength(1)),
  permissions: permissionsSchema
})

export type OrganizationMembership = z.infer<typeof organizationMembershipSchema>

/** Permissions only the owner holds; no custom role may include them (ADR 0033, D3). */
export const ownerOnlyPermissions = { organization: ['delete'] } as const satisfies Permissions

/** `owner`, `admin` and `member`: built in, never edited. */
export const builtInRoles = {
  owner: statements,
  admin: {
    organization: ['update'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    ac: ['create', 'read', 'update', 'delete']
  },
  member: { ac: ['read'] }
} as const satisfies Record<string, Permissions>

export type BuiltInRole = keyof typeof builtInRoles

/** Whether `permissions` hold one action on one resource. */
export function can<R extends Resource>(permissions: Permissions, resource: R, action: Action<R>): boolean {
  return (permissions[resource] as readonly string[] | undefined)?.includes(action) ?? false
}

/** Whether `held` holds every permission of `granted`: the test for who may hand a role to whom. */
export function covers(held: Permissions, granted: Permissions): boolean {
  return resources.every((resource) =>
    ((granted[resource] as readonly string[] | undefined) ?? []).every((action) =>
      (held[resource] as readonly string[] | undefined)?.includes(action)
    )
  )
}

/**
 * Words used by top-level routes of the web (ADR 0034), so no slug can shadow one. A test in the web
 * checks that every top-level route is on this list.
 */
export const reservedSlugs = [
  'account',
  'admin',
  'api',
  'app',
  'assets',
  'forgot-password',
  'invitations',
  'login',
  'new',
  'onboarding',
  'organizations',
  'reset-password',
  'settings',
  'signup'
] as const

/** How long an organization's name may be; the web says it when the name is too long. */
export const organizationNameLength = { max: 80 } as const

export const organizationNameSchema = z
  .string()
  .check(z.trim(), z.minLength(1), z.maxLength(organizationNameLength.max))

/** Lowercase letters and digits, single hyphens between them, at most 48 characters. */
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const organizationSlugSchema = z.string().check(
  z.maxLength(48),
  z.regex(kebab),
  z.refine((slug) => !(reservedSlugs as readonly string[]).includes(slug))
)

/** A custom role's name: same shape as a slug, at most 32 characters, never a built-in name. */
export const roleNameSchema = z.string().check(
  z.maxLength(32),
  z.regex(kebab),
  z.refine((name) => !Object.hasOwn(builtInRoles, name))
)
