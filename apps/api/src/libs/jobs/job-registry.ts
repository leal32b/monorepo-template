import type { JobDefinition, JobHandler, JobRegistrar } from '#libs/ports/job-queue.port'

export type JobRegistration = { definition: JobDefinition<unknown>; handler: JobHandler<unknown> }

/** The handler of each job kind (ADR 0056), filled by each module's `registerXJobs` in the composition root. */
export class JobRegistry implements JobRegistrar {
  readonly #registrations = new Map<string, JobRegistration>()

  register<Payload>(definition: JobDefinition<Payload>, handler: JobHandler<Payload>): void {
    if (this.#registrations.has(definition.kind)) {
      throw new Error(`job kind ${definition.kind} already has a handler`)
    }
    this.#registrations.set(definition.kind, { definition, handler } as JobRegistration)
  }

  find(kind: string): JobRegistration | undefined {
    return this.#registrations.get(kind)
  }
}
