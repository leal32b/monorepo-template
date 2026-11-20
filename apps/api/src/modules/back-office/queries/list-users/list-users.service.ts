import { type BackOfficeListQuery, type BackOfficeUserPage, backOfficePageSize } from '@repo/contracts'
import type { BackOfficeUnitOfWork } from '../../back-office-unit-of-work.port'

/** A page of every user, newest first, searched by email or name, with their organizations (ADR 0077). */
export class ListUsersService {
  constructor(private readonly unitOfWork: BackOfficeUnitOfWork) {}

  async execute({ search, page }: BackOfficeListQuery): Promise<BackOfficeUserPage> {
    const found = await this.unitOfWork.read(({ directory }) =>
      directory.users({ search, page, pageSize: backOfficePageSize })
    )
    return {
      items: found.items.map(({ createdAt, lastSignInAt, ...user }) => ({
        ...user,
        createdAt: createdAt.toISOString(),
        lastSignInAt: lastSignInAt === null ? null : lastSignInAt.toISOString()
      })),
      total: found.total,
      page,
      pageSize: backOfficePageSize
    }
  }
}
