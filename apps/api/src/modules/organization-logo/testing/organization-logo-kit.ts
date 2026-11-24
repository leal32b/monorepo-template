import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryFileStorage } from '#libs/adapters/in-memory-file-storage'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { InMemoryRateLimiter } from '#libs/adapters/in-memory-rate-limiter'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import { InMemoryLogoRepository } from './in-memory-logo-repository'

/** A PNG's signature and IHDR chunk, which is all the API reads of it. */
export function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header)
  header.writeUInt32BE(13, 8)
  header.write('IHDR', 12, 'latin1')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

/**
 * What a logo use-case test runs on (ADR 0076): the in-memory logos, trail and jobs in one unit of work, the
 * in-memory store and rate limiter, on a fixed clock, 20 November 2026 at 15:00 UTC, and a counter for ids.
 */
export function organizationLogoKit(now = new Date('2026-11-20T15:00:00.000Z')) {
  const clock = new FixedClock(now)
  let sequence = 0
  const ids = { generate: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` }
  const logos = new InMemoryLogoRepository()
  const audit = new InMemoryAuditTrail()
  const jobs = new InMemoryJobs(ids, clock)
  const unitOfWork = new InMemoryUnitOfWork({ logos, audit, jobs })
  const storage = new InMemoryFileStorage()
  const limiter = new InMemoryRateLimiter(clock)
  return { clock, ids, logos, audit, jobs, unitOfWork, storage, limiter }
}
