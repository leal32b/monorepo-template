import { builtInRoles } from '@repo/contracts'
import { isLastOwner, type Member, permissionsOfRoles, type Role, rolesOf } from './members'

const builtIn: Role[] = [
  { name: 'owner', permissions: builtInRoles.owner, builtIn: true },
  { name: 'admin', permissions: builtInRoles.admin, builtIn: true },
  { name: 'member', permissions: builtInRoles.member, builtIn: true }
]
const editor: Role = { name: 'editor', permissions: { invitation: ['create'] }, builtIn: false }

const member = (id: string, roles: string[]): Member => ({
  id,
  userId: `u-${id}`,
  name: `Member ${id}`,
  email: `${id}@example.com`,
  roles,
  createdAt: new Date('2026-11-04T12:00:00.000Z')
})

describe('permissionsOfRoles', () => {
  it('is what one role holds', () => {
    expect(permissionsOfRoles(['member'], builtIn)).toEqual({ ac: ['read'] })
  })

  it('joins what several roles hold, without repeating an action', () => {
    const held = permissionsOfRoles(['member', 'editor'], [...builtIn, editor])

    expect(held).toEqual({ ac: ['read'], invitation: ['create'] })
    expect(permissionsOfRoles(['admin', 'member'], builtIn).ac).toEqual(['create', 'read', 'update', 'delete'])
  })

  it('gives nothing for a role it does not know', () => {
    expect(permissionsOfRoles(['gone'], builtIn)).toEqual({})
  })
})

describe('rolesOf', () => {
  it('splits the comma-separated roles Better Auth stores, trimmed', () => {
    expect(rolesOf('member, editor')).toEqual(['member', 'editor'])
    expect(rolesOf('owner')).toEqual(['owner'])
  })
})

describe('isLastOwner', () => {
  it('is true for the one owner', () => {
    const members = [member('1', ['owner']), member('2', ['member'])]

    expect(isLastOwner(members[0] as Member, members)).toBe(true)
  })

  it('is false when another member is an owner too', () => {
    const members = [member('1', ['owner']), member('2', ['owner'])]

    expect(isLastOwner(members[0] as Member, members)).toBe(false)
  })

  it('is false for a member who is not an owner', () => {
    const members = [member('1', ['owner']), member('2', ['admin'])]

    expect(isLastOwner(members[1] as Member, members)).toBe(false)
  })
})
