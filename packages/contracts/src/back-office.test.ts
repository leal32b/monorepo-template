import { backOfficeListQuerySchema, impersonationPermissions } from './back-office'
import { covers, statements } from './organizations'

describe('impersonationPermissions (ADR 0077)', () => {
  it('holds the read action of every resource that has one, and nothing else', () => {
    expect(impersonationPermissions).toEqual({ ac: ['read'], customer: ['read'], audit: ['read'] })
    expect(covers(statements, impersonationPermissions)).toBe(true)
  })
})

describe('backOfficeListQuerySchema', () => {
  it('reads the page as a number, from the first, and trims the search', () => {
    expect(backOfficeListQuerySchema.parse({})).toEqual({ page: 1 })
    expect(backOfficeListQuerySchema.parse({ search: '  acme ', page: '3' })).toEqual({ search: 'acme', page: 3 })
    expect(backOfficeListQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    expect(backOfficeListQuerySchema.safeParse({ other: 'x' }).success).toBe(false)
  })
})
