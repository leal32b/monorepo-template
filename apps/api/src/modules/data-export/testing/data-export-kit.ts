import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryFileStorage } from '#libs/adapters/in-memory-file-storage'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import { InMemoryUnitOfWork } from '#libs/adapters/in-memory-unit-of-work'
import type { ExportTable } from '../export-table'
import type { DirectoryRead, OrganizationDirectory } from '../organization-directory.port'
import type { TenantRecords } from '../tenant-records.port'
import { InMemoryExportRepository } from './in-memory-export-repository'

/** `org-1` as the plugin's tables hold it: Ada owns it and reads pt-BR, in São Paulo. */
export const acme: DirectoryRead = {
  tables: [{ name: 'organization', columns: ['id', 'name'], rows: [['org-1', 'Acme Barbers']] }],
  organization: { name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo' },
  requester: { email: 'ada@example.com', locale: 'pt-BR' }
}

/**
 * What a data-export use-case or job test runs on (ADR 0074): the in-memory exports, trail and jobs, and tenant
 * records a test sets, in one unit of work, and the in-memory store (ADR 0076), on a fixed clock, 19 November
 * 2026 at noon, and a counter for ids.
 * The directory knows `org-1` as `acme` unless a test changes `directory.read`.
 */
export function dataExportKit(now = new Date('2026-11-19T12:00:00.000Z')) {
  const clock = new FixedClock(now)
  let sequence = 0
  const ids = { generate: () => `id-${++sequence}` }
  const exports = new InMemoryExportRepository()
  const audit = new InMemoryAuditTrail()
  const jobs = new InMemoryJobs(ids, clock)
  const tenantTables: ExportTable[] = [{ name: 'customers', columns: ['id', 'name'], rows: [['c-1', 'Grace']] }]
  const records: TenantRecords & { snapshot(): () => void } = {
    tables: async () => tenantTables,
    snapshot: () => () => undefined
  }
  const unitOfWork = new InMemoryUnitOfWork({ exports, records, audit, jobs })
  const directory: OrganizationDirectory = {
    read: async (organizationId, requesterId) =>
      organizationId === 'org-1' ? { ...acme, requester: requesterId === 'user-ada' ? acme.requester : null } : null
  }
  const webOrigin = 'https://app.example.com'
  const storage = new InMemoryFileStorage()
  return { clock, ids, exports, audit, jobs, unitOfWork, directory, storage, webOrigin }
}
