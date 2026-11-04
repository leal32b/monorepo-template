import { validateRole } from './validate-role'

const none = new Set<string>()

describe('validateRole', () => {
  it('cleans the name and keeps only the resources that have an action', () => {
    expect(
      validateRole({ name: '  Editor ', permissions: { invitation: ['create'], member: [], ac: ['read'] } }, none)
    ).toEqual({ ok: true, values: { name: 'editor', permission: { invitation: ['create'], ac: ['read'] } } })
  })

  it.each([
    ['empty', '', 'nameRequired'],
    ['blank', '   ', 'nameRequired'],
    ['a built-in name', 'Admin', 'nameBuiltIn'],
    ['a name the organization has', 'Billing', 'nameTaken'],
    ['a space inside', 'big boss', 'nameInvalid'],
    ['too long', 'a'.repeat(33), 'nameInvalid']
  ] as const)('refuses a name that is %s', (_case, name, problem) => {
    const result = validateRole({ name, permissions: { ac: ['read'] } }, new Set(['billing']))

    expect(result).toEqual({ ok: false, problems: { name: problem } })
  })

  it('refuses a role with no permission', () => {
    expect(validateRole({ name: 'editor', permissions: {} }, none)).toEqual({
      ok: false,
      problems: { permissions: 'noPermission' }
    })
    expect(validateRole({ name: 'editor', permissions: { member: [] } }, none)).toEqual({
      ok: false,
      problems: { permissions: 'noPermission' }
    })
  })

  it('says both problems at once', () => {
    expect(validateRole({ name: '', permissions: {} }, none)).toEqual({
      ok: false,
      problems: { name: 'nameRequired', permissions: 'noPermission' }
    })
  })
})
