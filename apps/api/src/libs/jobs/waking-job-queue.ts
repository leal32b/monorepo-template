import type { EnqueueOptions, JobDefinition, JobQueue } from '#libs/ports/job-queue.port'

/**
 * A queue that tells this process's worker when it has enqueued (ADR 0056), so an idle worker looks
 * at once without polling. On a transaction the job may not be committed yet; the worker allows for it.
 */
export class WakingJobQueue implements JobQueue {
  readonly #queue: JobQueue
  readonly #wake: () => void

  constructor(queue: JobQueue, wake: () => void) {
    this.#queue = queue
    this.#wake = wake
  }

  async enqueue<Payload>(
    definition: JobDefinition<Payload>,
    payload: Payload,
    options?: EnqueueOptions
  ): Promise<string> {
    const id = await this.#queue.enqueue(definition, payload, options)
    this.#wake()
    return id
  }
}
