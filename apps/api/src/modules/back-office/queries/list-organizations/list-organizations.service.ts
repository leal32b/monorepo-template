import {
  accessOf,
  type BackOfficeListQuery,
  type BackOfficeOrganizationPage,
  backOfficePageSize
} from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { BackOfficeUnitOfWork } from '../../back-office-unit-of-work.port'

/** A page of every organization, newest first, searched by name, slug or the owner's email (ADR 0077). */
export class ListOrganizationsService {
  constructor(
    private readonly unitOfWork: BackOfficeUnitOfWork,
    private readonly clock: Clock
  ) {}

  async execute({ search, page }: BackOfficeListQuery): Promise<BackOfficeOrganizationPage> {
    const found = await this.unitOfWork.read(({ directory }) =>
      directory.organizations({ search, page, pageSize: backOfficePageSize })
    )
    const now = this.clock.now()
    return {
      items: found.items.map(({ subscription, createdAt, ...organization }) => ({
        ...organization,
        createdAt: createdAt.toISOString(),
        subscription: { status: subscription.status, access: accessOf(subscription, now), plan: subscription.plan }
      })),
      total: found.total,
      page,
      pageSize: backOfficePageSize
    }
  }
}
