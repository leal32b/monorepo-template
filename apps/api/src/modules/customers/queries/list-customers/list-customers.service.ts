import { type CustomerList, customerPageSize, type ListCustomersQuery } from '@repo/contracts'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse } from '../../customer-response'

export class ListCustomersService {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(organizationId: string, query: ListCustomersQuery): Promise<CustomerList> {
    const { items, total } = await this.repository.list(organizationId, { ...query, pageSize: customerPageSize })
    return { items: items.map(toCustomerResponse), total, page: query.page, pageSize: customerPageSize }
  }
}
