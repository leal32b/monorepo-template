import { type CustomerList, customerPageSize, type ListCustomersQuery } from '@repo/contracts'
import { toCustomerResponse } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'

export class ListCustomersService {
  constructor(private readonly unitOfWork: CustomersUnitOfWork) {}

  async execute(organizationId: string, query: ListCustomersQuery): Promise<CustomerList> {
    const { items, total } = await this.unitOfWork.run(organizationId, ({ customers }) =>
      customers.list(organizationId, { ...query, pageSize: customerPageSize })
    )
    return { items: items.map(toCustomerResponse), total, page: query.page, pageSize: customerPageSize }
  }
}
