import { auditActions } from './audit'

describe('auditActions', () => {
  it('lists what the customers module records, every write of it', () => {
    expect(auditActions.customer).toEqual(['created', 'updated', 'archived', 'restored', 'deleted'])
  })
})
