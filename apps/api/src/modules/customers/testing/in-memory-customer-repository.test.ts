import { describeCustomerRepository } from './customer-repository.contract'
import { InMemoryCustomerRepository } from './in-memory-customer-repository'

describeCustomerRepository('InMemoryCustomerRepository', async () => new InMemoryCustomerRepository())
