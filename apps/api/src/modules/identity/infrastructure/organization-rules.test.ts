import { holdsOwnerOnlyPermission, parseRolePermission, permissionsOfRoles } from './organization-rules'

describe('parseRolePermission', () => {
  it('reads a stored custom role', () => {
    expect(parseRolePermission('{"member":["create"]}')).toEqual({ member: ['create'] })
  })

  it('grants nothing for a stored value that is not a valid set of permissions', () => {
    expect(parseRolePermission('{"billing":["read"]}')).toEqual({})
  })
})

describe('permissionsOfRoles', () => {
  const custom = new Map([['editor', { invitation: ['create' as const] }]])

  it('joins built-in and custom roles of a comma list, spaces allowed', () => {
    expect(permissionsOfRoles('member, editor', custom)).toEqual({ ac: ['read'], invitation: ['create'] })
  })

  it('grants nothing for a role name with no definition', () => {
    expect(permissionsOfRoles('ghost', custom)).toEqual({})
  })
})

describe('holdsOwnerOnlyPermission', () => {
  it('spots the deletion of the organization', () => {
    expect(holdsOwnerOnlyPermission({ organization: ['update', 'delete'] })).toBe(true)
    expect(holdsOwnerOnlyPermission({ organization: ['update'], member: ['delete'] })).toBe(false)
  })
})
