import {
  customerInputSchema,
  customerLength,
  customerListSchema,
  customerPageSize,
  customerSchema,
  customerUpdateSchema,
  listCustomersQuerySchema
} from './customers'

describe('customerInputSchema', () => {
  it('needs only a name, and trims it', () => {
    expect(customerInputSchema.parse({ name: '  Ada Lovelace ' })).toEqual({ name: 'Ada Lovelace' })
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['too long', 'a'.repeat(customerLength.name + 1)]
  ])('rejects a name that is %s', (_case, name) => {
    expect(customerInputSchema.safeParse({ name }).success).toBe(false)
  })

  it('lowercases and trims the email', () => {
    expect(customerInputSchema.parse({ name: 'Ada', email: '  Ada@Example.COM ' }).email).toBe('ada@example.com')
  })

  it('reads a blank optional field as none, so a cleared form field needs no special case', () => {
    expect(customerInputSchema.parse({ name: 'Ada', email: ' ', phone: '', company: '  ', notes: '' })).toEqual({
      name: 'Ada',
      email: null,
      phone: null,
      company: null,
      notes: null
    })
  })

  it('rejects an email that is not one', () => {
    expect(customerInputSchema.safeParse({ name: 'Ada', email: 'ada' }).success).toBe(false)
  })

  it.each(['phone', 'company', 'notes'] as const)('rejects a %s that is too long', (field) => {
    const input = { name: 'Ada', [field]: 'a'.repeat(customerLength[field] + 1) }
    expect(customerInputSchema.safeParse(input).success).toBe(false)
  })

  it('rejects a field it does not know, so a client cannot choose the id or the organization', () => {
    expect(customerInputSchema.safeParse({ name: 'Ada', organizationId: 'x' }).success).toBe(false)
  })
})

describe('customerUpdateSchema', () => {
  it('is the whole customer and the version it was read at', () => {
    expect(customerUpdateSchema.parse({ name: ' Ada ', version: 3 })).toEqual({ name: 'Ada', version: 3 })
  })

  it.each([undefined, 0, 1.5, '2'])('refuses the version %j', (version) => {
    expect(customerUpdateSchema.safeParse({ name: 'Ada', version }).success).toBe(false)
  })
})

describe('customerSchema', () => {
  const customer = {
    id: 'c1',
    name: 'Ada',
    email: null,
    phone: null,
    company: null,
    notes: null,
    createdAt: '2026-11-07T10:00:00.000Z',
    updatedAt: '2026-11-07T10:00:00.000Z',
    archivedAt: null,
    version: 1
  }

  it('accepts a customer with every optional field empty, or filled', () => {
    expect(customerSchema.safeParse(customer).success).toBe(true)
    expect(
      customerSchema.safeParse({
        ...customer,
        email: 'ada@example.com',
        phone: '+55 11 99999-0000',
        company: 'Analytical Engines',
        notes: 'First programmer.',
        archivedAt: '2026-11-08T10:00:00.000Z'
      }).success
    ).toBe(true)
  })

  it('rejects a date that is not ISO 8601', () => {
    expect(customerSchema.safeParse({ ...customer, createdAt: 'yesterday' }).success).toBe(false)
  })
})

describe('listCustomersQuerySchema', () => {
  it('shows active customers, first page, when the query says nothing', () => {
    expect(listCustomersQuerySchema.parse({})).toEqual({ status: 'active', page: 1 })
  })

  it('reads the page as a number, since a query string is text', () => {
    expect(listCustomersQuerySchema.parse({ page: '3', status: 'archived', search: ' ada ' })).toEqual({
      status: 'archived',
      page: 3,
      search: 'ada'
    })
  })

  it.each(['0', '-1', '1.5', 'x'])('rejects the page %s', (page) => {
    expect(listCustomersQuerySchema.safeParse({ page }).success).toBe(false)
  })

  it('rejects a status it does not know', () => {
    expect(listCustomersQuerySchema.safeParse({ status: 'all' }).success).toBe(false)
  })
})

describe('customerListSchema', () => {
  it('carries the page, its size and the total, so the web can draw the pager', () => {
    const list = { items: [], total: 0, page: 1, pageSize: customerPageSize }
    expect(customerListSchema.safeParse(list).success).toBe(true)
  })
})
