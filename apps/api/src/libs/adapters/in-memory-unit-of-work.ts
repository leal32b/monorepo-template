import type { UnitOfWork } from '#libs/ports/unit-of-work.port'

/** What an in-memory repository offers a unit of work: its state now, as a function that puts it back. */
export interface InMemoryStore {
  snapshot(): () => void
}

/**
 * The unit of work for use-case tests (ADR 0052): `work` gets the same in-memory repositories, and a
 * throw puts each one back as it was. One unit of work at a time: it does not isolate two running at once.
 * It does not confine the work to the organization as Postgres does (ADR 0055): the fakes' own filters do.
 */
export class InMemoryUnitOfWork<Repositories extends Record<string, InMemoryStore>>
  implements UnitOfWork<Repositories>
{
  readonly #repositories: Repositories

  constructor(repositories: Repositories) {
    this.#repositories = repositories
  }

  async run<T>(_organizationId: string, work: (repositories: Repositories) => Promise<T>): Promise<T> {
    const restores = Object.values(this.#repositories).map((store) => store.snapshot())
    try {
      return await work(this.#repositories)
    } catch (error) {
      for (const restore of restores) restore()
      throw error
    }
  }
}
