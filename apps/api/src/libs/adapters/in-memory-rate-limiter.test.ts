import { describeRateLimiter } from '#libs/rate-limit/testing/rate-limiter.contract'
import { InMemoryRateLimiter } from './in-memory-rate-limiter'

describeRateLimiter('InMemoryRateLimiter', async (clock) => new InMemoryRateLimiter(clock))
