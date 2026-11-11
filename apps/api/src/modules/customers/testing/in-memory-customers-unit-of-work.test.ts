import { describeCustomersUnitOfWork } from './customers-unit-of-work.contract'
import { testCustomers } from './test-customers'

describeCustomersUnitOfWork('InMemoryUnitOfWork', async () => {
  const { repository, changes, unitOfWork } = testCustomers()
  return { unitOfWork, customers: repository, changes }
})
