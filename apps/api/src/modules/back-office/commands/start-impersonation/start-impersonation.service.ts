import { backOfficeLimits, type Impersonation } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { ImpersonationActiveException, OrganizationNotFoundException } from '../../back-office.exceptions'
import type { BackOfficeUnitOfWork } from '../../back-office-unit-of-work.port'
import { endImpersonationJob } from '../../jobs/end-impersonation'
import { impersonationResponse } from '../../queries/get-impersonation/get-impersonation.service'
import { endVisit } from '../end-impersonation/end-impersonation.service'

/**
 * An operator enters an organization, read only, for `backOfficeLimits.impersonationMinutes` (ADR 0077): the
 * visit, its entry in the organization's trail naming the operator, and the job that ends it at its expiry, in
 * one transaction. One visit at a time: a second is refused while the first lasts, and one past its time is
 * ended first, as its job would.
 */
export class StartImpersonationService {
  constructor(
    private readonly unitOfWork: BackOfficeUnitOfWork,
    readonly ids: IdGenerator,
    readonly clock: Clock
  ) {}

  async execute(operatorId: string, organizationId: string): Promise<Impersonation> {
    const organization = await this.unitOfWork.read(({ directory }) => directory.organization(organizationId))
    if (organization === null) throw new OrganizationNotFoundException()
    return this.unitOfWork.write(async (repositories) => {
      const { impersonations, audit, jobs } = repositories
      const startedAt = this.clock.now()
      const active = await impersonations.active(operatorId)
      if (active !== null) {
        if (active.expiresAt > startedAt) throw new ImpersonationActiveException()
        await endVisit(repositories, this, active.id, 'expired')
      }
      const id = this.ids.generate()
      const expiresAt = new Date(startedAt.getTime() + backOfficeLimits.impersonationMinutes * 60 * 1000)
      await impersonations.start({ id, operatorId, organizationId, startedAt, expiresAt })
      await audit.record({
        id: this.ids.generate(),
        organizationId,
        at: startedAt,
        actor: { kind: 'operator', id: operatorId },
        resourceType: 'organization',
        resourceId: organizationId,
        action: 'impersonation-started',
        fields: []
      })
      await jobs.enqueue(endImpersonationJob, { impersonationId: id }, { runAt: expiresAt })
      return impersonationResponse({
        id,
        operatorId,
        organization: { id: organization.id, name: organization.name, slug: organization.slug },
        startedAt,
        expiresAt
      })
    })
  }
}
