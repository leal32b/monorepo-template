import type { Member, Membership } from '../membership.port'

/** Test double: the members a test adds, and nobody else. */
export class FakeMembership implements Membership {
  readonly #members: Member[] = []

  add(member: Member): void {
    this.#members.push(member)
  }

  async memberOf(organizationId: string, userId: string): Promise<Member | null> {
    return this.#members.find((member) => member.organizationId === organizationId && member.userId === userId) ?? null
  }
}
