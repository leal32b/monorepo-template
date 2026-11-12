import type { Member, Membership } from '../membership.port'

/** Test double: the members a test adds, and nobody else. */
export class FakeMembership implements Membership {
  readonly #members: { member: Member; name: string }[] = []

  /** A member, named by their user id unless a name is given. */
  add(member: Member, name = member.userId): void {
    this.#members.push({ member, name })
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    return (
      this.#members.find(({ member }) => member.organizationId === organizationId && member.userId === userId)
        ?.member ?? null
    )
  }

  async namesOf(organizationId: string, userIds: readonly string[]): Promise<Map<string, string>> {
    return new Map(
      this.#members
        .filter(({ member }) => member.organizationId === organizationId && userIds.includes(member.userId))
        .map(({ member, name }) => [member.userId, name])
    )
  }
}
