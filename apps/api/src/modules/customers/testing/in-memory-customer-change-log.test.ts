import { describeCustomerChangeLog } from './customer-change-log.contract'
import { InMemoryCustomerChangeLog } from './in-memory-customer-change-log'

describeCustomerChangeLog('InMemoryCustomerChangeLog', async () => new InMemoryCustomerChangeLog())
