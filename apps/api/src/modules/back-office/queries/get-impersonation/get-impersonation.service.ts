import type { CurrentImpersonation, Impersonation } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { BackOfficeUnitOfWork, ImpersonationRecord } from '../../back-office-unit-of-work.port'

/** A visit in the shape of the contract. */
export const impersonationResponse = (visit: ImpersonationRecord): Impersonation => ({
  organization: visit.organization,
  startedAt: visit.startedAt.toISOString(),
  endsAt: visit.expiresAt.toISOString()
})

/**
 * The operator's visit now (ADR 0077), or `null`: one past its time is over already, though its job may not have
 * written its end yet.
 */
export class GetImpersonationService {
  constructor(
    private readonly unitOfWork: BackOfficeUnitOfWork,
    private readonly clock: Clock
  ) {}

  async execute(operatorId: string): Promise<CurrentImpersonation> {
    const visit = await this.unitOfWork.read(({ impersonations }) => impersonations.active(operatorId))
    const current = visit !== null && visit.expiresAt > this.clock.now() ? visit : null
    return { impersonation: current === null ? null : impersonationResponse(current) }
  }
}
