import {
  builtInRoles,
  can,
  covers,
  organizationMembershipSchema,
  organizationNameSchema,
  organizationSlugSchema,
  ownerOnlyPermissions,
  permissionsSchema,
  reservedSlugs,
  roleNameSchema,
  statements
} from './organizations'

describe('statements', () => {
  it('names every resource with its actions', () => {
    expect(statements).toEqual({
      organization: ['update', 'delete'],
      member: ['create', 'update', 'delete'],
      invitation: ['create', 'cancel'],
      ac: ['create', 'read', 'update', 'delete']
    })
  })
})

describe('builtInRoles', () => {
  it('gives the owner every permission', () => {
    expect(covers(builtInRoles.owner, statements)).toBe(true)
  })

  it('keeps organization:delete for the owner only', () => {
    expect(ownerOnlyPermissions).toEqual({ organization: ['delete'] })
    expect(can(builtInRoles.owner, 'organization', 'delete')).toBe(true)
    expect(can(builtInRoles.admin, 'organization', 'delete')).toBe(false)
    expect(can(builtInRoles.member, 'organization', 'delete')).toBe(false)
  })

  it('lets the admin manage everything but the deletion', () => {
    expect(can(builtInRoles.admin, 'organization', 'update')).toBe(true)
    expect(can(builtInRoles.admin, 'member', 'delete')).toBe(true)
    expect(can(builtInRoles.admin, 'ac', 'create')).toBe(true)
  })

  it('lets the member only read the roles', () => {
    expect(can(builtInRoles.member, 'ac', 'read')).toBe(true)
    expect(can(builtInRoles.member, 'ac', 'create')).toBe(false)
    expect(can(builtInRoles.member, 'member', 'create')).toBe(false)
  })
})

describe('can', () => {
  it('is false for a resource the permissions leave out', () => {
    expect(can({}, 'member', 'create')).toBe(false)
  })
})

describe('covers', () => {
  it('holds when every granted permission is held', () => {
    expect(covers(builtInRoles.admin, builtInRoles.member)).toBe(true)
    expect(covers({}, {})).toBe(true)
  })

  it('fails when one granted permission is not held', () => {
    expect(covers(builtInRoles.admin, builtInRoles.owner)).toBe(false)
    expect(covers({ member: ['create'] }, { member: ['create', 'delete'] })).toBe(false)
    expect(covers({}, { member: ['create'] })).toBe(false)
  })

  it('ignores a resource granted with no action', () => {
    expect(covers({}, { member: [] })).toBe(true)
  })
})

describe('permissionsSchema', () => {
  it('accepts known resources and actions', () => {
    expect(permissionsSchema.safeParse({ member: ['create'], ac: ['read'] }).success).toBe(true)
    expect(permissionsSchema.safeParse({}).success).toBe(true)
  })

  it.each([
    ['an unknown resource', { project: ['read'] }],
    ['an unknown action', { member: ['fly'] }],
    ['an action of another resource', { invitation: ['delete'] }],
    ['actions that are not a list', { member: 'create' }]
  ])('rejects %s', (_case, value) => {
    expect(permissionsSchema.safeParse(value).success).toBe(false)
  })
})

describe('roleNameSchema', () => {
  it.each(['editor', 'billing-lead', 'a1'])('accepts %s', (name) => {
    expect(roleNameSchema.safeParse(name).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['uppercase', 'Editor'],
    ['a space', 'big boss'],
    ['an edge hyphen', '-editor'],
    ['a double hyphen', 'a--b'],
    ['too long', 'a'.repeat(33)],
    ['a built-in name', 'admin']
  ])('rejects %s', (_case, name) => {
    expect(roleNameSchema.safeParse(name).success).toBe(false)
  })
})

describe('organizationNameSchema', () => {
  it('accepts a name and trims it', () => {
    expect(organizationNameSchema.parse('  Acme Inc  ')).toBe('Acme Inc')
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['too long', 'a'.repeat(81)]
  ])('rejects %s', (_case, name) => {
    expect(organizationNameSchema.safeParse(name).success).toBe(false)
  })
})

describe('organizationSlugSchema', () => {
  it.each(['acme', 'acme-inc', 'a1', '42', 'a'.repeat(48)])('accepts %s', (slug) => {
    expect(organizationSlugSchema.safeParse(slug).success).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['uppercase', 'Acme'],
    ['a space', 'has spaces'],
    ['a slash or query', 'a/b?c'],
    ['an accent', 'café'],
    ['a leading hyphen', '-acme'],
    ['a trailing hyphen', 'acme-'],
    ['a double hyphen', 'acme--inc'],
    ['too long', 'a'.repeat(49)]
  ])('rejects %s', (_case, slug) => {
    expect(organizationSlugSchema.safeParse(slug).success).toBe(false)
  })

  it.each(reservedSlugs)('rejects the reserved word %s', (slug) => {
    expect(organizationSlugSchema.safeParse(slug).success).toBe(false)
  })

  it('reserves the top-level routes of ADR 0034', () => {
    for (const word of ['login', 'signup', 'settings', 'account', 'invitations', 'onboarding', 'api']) {
      expect(reservedSlugs).toContain(word)
    }
  })
})

describe('organizationMembershipSchema', () => {
  it('accepts the roles and the permissions they resolve to', () => {
    const membership = { roles: ['member', 'editor'], permissions: { ac: ['read'], invitation: ['create'] } }

    expect(organizationMembershipSchema.parse(membership)).toEqual(membership)
  })

  it.each([
    ['no role', { roles: [], permissions: {} }],
    ['an unknown permission', { roles: ['member'], permissions: { project: ['read'] } }]
  ])('rejects %s', (_case, value) => {
    expect(organizationMembershipSchema.safeParse(value).success).toBe(false)
  })
})
