import type { Logger } from 'pino'
import * as z from 'zod/mini'
import type { Clock } from '#libs/ports/clock.port'
import type { JobDefinition, JobQueue, JobRegistrar } from '#libs/ports/job-queue.port'

/**
 * The queue's own check (ADR 0056): the API enqueues one as it starts, and the handler says in the
 * log that the job arrived. Every deploy and every wake then shows that this environment enqueues,
 * claims and completes. It is also the smallest example of a job kind: a definition, a handler
 * registered by the module, and an enqueue.
 */
const queueCheck: JobDefinition<{ release: string; enqueuedAt: string }> = {
  kind: 'health.queue-check',
  schema: z.object({ release: z.string(), enqueuedAt: z.iso.datetime() })
}

export function registerHealthJobs(registrar: JobRegistrar, { clock, logger }: { clock: Clock; logger: Logger }): void {
  registrar.register(queueCheck, async ({ release, enqueuedAt }) => {
    const waitedMs = clock.now().getTime() - new Date(enqueuedAt).getTime()
    logger.info({ enqueuedBy: release, waitedMs }, 'job queue working')
  })
}

/** Leaves one check in the queue, stamped with the release that asked and when. */
export function enqueueQueueCheck(queue: JobQueue, clock: Clock, release: string): Promise<string> {
  return queue.enqueue(queueCheck, { release, enqueuedAt: clock.now().toISOString() })
}
