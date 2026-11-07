import { type Insertable, type Kysely, sql } from 'kysely'
import type { CustomerFilter, CustomerRepository } from '../customer-repository.port'
import type { Customer } from '../domain/customer'
import { CustomerEmailTakenException } from '../domain/customers.errors'

type CustomerRow = {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  created_at: Date
  archived_at: Date | null
}

type CustomersDatabase = { customer: CustomerRow }

const EMAIL_KEY = 'customer_organization_email_key'

/** Postgres through Kysely (ADR 0013). The unique index is the judge of an email; the code only names the failure. */
export class KyselyCustomerRepository implements CustomerRepository {
  readonly #db: Kysely<CustomersDatabase>

  constructor(db: Kysely<unknown>) {
    this.#db = db.withTables<CustomersDatabase>()
  }

  async insert(customer: Customer): Promise<void> {
    await this.#db.insertInto('customer').values(toRow(customer)).execute().catch(rethrowEmailTaken)
  }

  async save(customer: Customer): Promise<void> {
    const { id, organization_id, created_at, ...columns } = toRow(customer)
    await this.#db
      .updateTable('customer')
      .set(columns)
      .where('organization_id', '=', organization_id)
      .where('id', '=', id)
      .execute()
      .catch(rethrowEmailTaken)
  }

  async findById(organizationId: string, id: string): Promise<Customer | null> {
    const row = await this.#db
      .selectFrom('customer')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst()
    return row === undefined ? null : toCustomer(row)
  }

  async list(organizationId: string, filter: CustomerFilter): Promise<{ items: Customer[]; total: number }> {
    const matching = this.#db
      .selectFrom('customer')
      .where('organization_id', '=', organizationId)
      .where('archived_at', filter.status === 'active' ? 'is' : 'is not', null)
      .$if(filter.search !== undefined, (query) => {
        const pattern = `%${escapeLike((filter.search as string).toLowerCase())}%`
        return query.where(({ or, eb }) =>
          or([
            eb(sql`lower(name)`, 'like', pattern),
            eb(sql`lower(email)`, 'like', pattern),
            eb(sql`lower(company)`, 'like', pattern)
          ])
        )
      })
    const [rows, count] = await Promise.all([
      matching
        .selectAll()
        // "C" collation: plain code-unit order, the same on every server and in the in-memory fake.
        .orderBy(sql`lower(name) collate "C"`)
        .orderBy(sql`id collate "C"`)
        .limit(filter.pageSize)
        .offset((filter.page - 1) * filter.pageSize)
        .execute(),
      matching.select(({ fn }) => fn.countAll<string>().as('total')).executeTakeFirstOrThrow()
    ])
    return { items: rows.map(toCustomer), total: Number(count.total) }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.#db.deleteFrom('customer').where('organization_id', '=', organizationId).where('id', '=', id).execute()
  }
}

/** `like` reads `%`, `_` and `\` as pattern; a search is plain text. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`)

function rethrowEmailTaken(error: unknown): never {
  const { code, constraint } = error as { code?: string; constraint?: string }
  if (code === '23505' && constraint === EMAIL_KEY) throw new CustomerEmailTakenException()
  throw error
}

function toRow(customer: Customer): Insertable<CustomerRow> {
  return {
    id: customer.id,
    organization_id: customer.organizationId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    notes: customer.notes,
    created_at: customer.createdAt,
    archived_at: customer.archivedAt
  }
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    notes: row.notes,
    createdAt: row.created_at,
    archivedAt: row.archived_at
  }
}
