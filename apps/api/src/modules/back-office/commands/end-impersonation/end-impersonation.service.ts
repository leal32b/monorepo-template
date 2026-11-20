import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { BackOfficeUnitOfWork, BackOfficeWrites, EndReason } from '../../back-office-unit-of-work.port'

/**
 * Ends a visit that has not ended, with its entry in the organization's trail naming the operator (ADR 0077).
 * A visit ended already changes nothing, so each end is written once, whoever gets there first.
 */
export async function endVisit(
  { impersonations, audit }: BackOfficeWrites,
  { ids, clock }: { ids: IdGenerator; clock: Clock },
  impersonationId: string,
  reason: EndReason
): Promise<void> {
  const at = clock.now()
  const ended = await impersonations.end(impersonationId, at, reason)
  if (ended === null) return
  await audit.record({
    id: ids.generate(),
    organizationId: ended.organizationId,
    at,
    actor: { kind: 'operator', id: ended.operatorId },
    resourceType: 'organization',
    resourceId: ended.organizationId,
    action: 'impersonation-ended',
    fields: []
  })
}

/** An operator's visit ends: they leave, the time limit comes (the job), or they are revoked (ADR 0077). */
export class EndImpersonationService {
  constructor(
    private readonly unitOfWork: BackOfficeUnitOfWork,
    readonly ids: IdGenerator,
    readonly clock: Clock
  ) {}

  /** The operator leaves the organization they are in; nothing happens when they are in none. */
  leave(operatorId: string): Promise<void> {
    return this.unitOfWork.write(async (repositories) => {
      const visit = await repositories.impersonations.active(operatorId)
      if (visit !== null) await endVisit(repositories, this, visit.id, 'left')
    })
  }

  /** The visit ends for `reason`, if it has not ended: the job at its expiry, or a revocation. */
  end(impersonationId: string, reason: Exclude<EndReason, 'left'>): Promise<void> {
    return this.unitOfWork.write((repositories) => endVisit(repositories, this, impersonationId, reason))
  }
}
