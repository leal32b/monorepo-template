import type { PublicCustomerRegistrationValues } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { customerEntry } from '../../customer-audit'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { changedFields, registerCustomer } from '../../domain/customer'
import { CustomerEmailTakenException } from '../../domain/customers.errors'

/**
 * The module's public write (ADR 0059): a visitor, with no session, becomes a customer of the
 * organization their route's slug named. It runs in the unit of work like a member's use case, so
 * Postgres confines both writes to that organization (ADR 0055). It returns nothing, and ends the
 * same way when the email is already a customer: the public form must not tell who is one.
 */
export class RegisterCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, values: Omit<PublicCustomerRegistrationValues, 'referralCode'>): Promise<void> {
    const now = this.clock.now()
    const customer = registerCustomer({
      id: this.ids.generate(),
      organizationId,
      now,
      details: { name: values.name, email: values.email ?? null, phone: values.phone ?? null }
    })
    // The actor is always a visitor, who has no id (ADR 0061): the route has no session.
    const entry = customerEntry(customer, {
      id: this.ids.generate(),
      at: now,
      actor: { kind: 'visitor' },
      action: 'created',
      fields: changedFields(null, customer)
    })
    try {
      await this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
        await customers.insert(customer)
        await audit.record(entry)
      })
    } catch (error) {
      // Already a customer: the transaction rolled back, and the stored customer stays as the members keep it.
      if (!(error instanceof CustomerEmailTakenException)) throw error
    }
  }
}
