import { describeCustomersUnitOfWork } from './customers-unit-of-work.contract'
import { testCustomers } from './test-customers'

describeCustomersUnitOfWork('InMemoryUnitOfWork', async () => {
  const { repository, audit, jobs, unitOfWork } = testCustomers()
  return { unitOfWork, customers: repository, audit, jobsKept: async () => jobs.all.length }
})
