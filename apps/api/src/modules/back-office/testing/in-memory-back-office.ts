import { trialFrom } from '@repo/contracts'
import { InMemoryAuditTrail } from '#libs/adapters/in-memory-audit-trail'
import { InMemoryJobs } from '#libs/adapters/in-memory-jobs'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type {
  BackOfficeDirectory,
  BackOfficeReads,
  BackOfficeUnitOfWork,
  BackOfficeWrites,
  DirectoryOrganization,
  DirectoryOrganizationDetail,
  DirectorySearch,
  DirectoryUser,
  EndReason,
  ImpersonationRecord,
  Impersonations,
  OperatorAccount,
  Operators
} from '../back-office-unit-of-work.port'

type Visit = ImpersonationRecord & { endedAt: Date | null; endReason: EndReason | null }

/**
 * Test double of the back office's database (ADR 0077): the organizations, users and operators a test adds,
 * the visits, the trail and the queue. A search returns every row, a page at a time: the searches are the Kysely
 * adapter's, tested on Postgres.
 */
export class InMemoryBackOffice implements BackOfficeUnitOfWork {
  readonly organizations: DirectoryOrganizationDetail[] = []
  readonly users: DirectoryUser[] = []
  readonly operators = new Map<string, OperatorAccount>()
  readonly visits: Visit[] = []
  readonly audit = new InMemoryAuditTrail()
  readonly jobs: InMemoryJobs

  constructor(ids: IdGenerator, clock: Clock) {
    this.jobs = new InMemoryJobs(ids, clock)
  }

  readonly #operators: Operators = { find: async (userId) => this.operators.get(userId) ?? null }

  readonly #directory: BackOfficeDirectory = {
    organizations: async (search) => pageOf(this.organizations.map(listed), search),
    organization: async (id) => this.organizations.find((organization) => organization.id === id) ?? null,
    users: async (search) => pageOf(this.users, search)
  }

  readonly #impersonations: Impersonations = {
    active: async (operatorId) => {
      const visit = this.visits.find((candidate) => candidate.operatorId === operatorId && candidate.endedAt === null)
      if (visit === undefined) return null
      const { endedAt: _, endReason: __, ...record } = visit
      return record
    },
    start: async ({ id, operatorId, organizationId, startedAt, expiresAt }) => {
      const { name, slug, timeZone, currency } = this.organizations.find(
        (organization) => organization.id === organizationId
      ) as DirectoryOrganizationDetail
      this.visits.push({
        id,
        operatorId,
        organization: { id: organizationId, name, slug, timeZone, currency },
        startedAt,
        expiresAt,
        endedAt: null,
        endReason: null
      })
    },
    end: async (id, at, reason) => {
      const visit = this.visits.find((candidate) => candidate.id === id && candidate.endedAt === null)
      if (visit === undefined) return null
      visit.endedAt = at
      visit.endReason = reason
      return { organizationId: visit.organization.id, operatorId: visit.operatorId }
    }
  }

  read<T>(work: (repositories: BackOfficeReads) => Promise<T>): Promise<T> {
    return work({ operators: this.#operators, directory: this.#directory, impersonations: this.#impersonations })
  }

  /** Keeps what `work` wrote even when it throws: no use case of the back office writes before it may fail. */
  write<T>(work: (repositories: BackOfficeWrites) => Promise<T>): Promise<T> {
    return work({ impersonations: this.#impersonations, audit: this.audit, jobs: this.jobs })
  }
}

function listed({
  timeZone: _,
  currency: __,
  members,
  ...organization
}: DirectoryOrganizationDetail): DirectoryOrganization {
  const owner = members.find((member) => member.role.split(',').includes('owner'))
  return {
    ...organization,
    owner: owner === undefined ? null : { id: owner.id, name: owner.name, email: owner.email },
    members: members.length
  }
}

function pageOf<Item>(items: Item[], { page, pageSize }: DirectorySearch): { items: Item[]; total: number } {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length }
}

/** An organization on trial since the 1st of November, owned by Ada, as the directory reads it. */
export function anOrganization(
  id: string,
  overrides: Partial<DirectoryOrganizationDetail> = {}
): DirectoryOrganizationDetail {
  return {
    id,
    name: `Name of ${id}`,
    slug: id,
    createdAt: new Date('2026-11-01T09:00:00Z'),
    timeZone: 'UTC',
    currency: 'USD',
    subscription: trialFrom(new Date('2026-11-01T09:00:00Z')),
    members: [
      {
        id: 'user-ada',
        name: 'Ada',
        email: 'ada@example.test',
        role: 'owner',
        joinedAt: new Date('2026-11-01T09:00:00Z')
      }
    ],
    ...overrides
  }
}
