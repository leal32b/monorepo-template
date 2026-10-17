import type { Server } from 'node:http'
import type { Logger } from 'pino'

export type ShutdownOptions = {
  server: Server
  logger: Logger
  /** How long in-flight requests may take before their connections are cut. */
  timeoutMs: number
}

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests finish, drop idle
 * keep-alive connections, and cut whatever is still open after `timeoutMs`.
 * Idempotent: every call returns the same promise.
 */
export function createShutdown({ server, logger, timeoutMs }: ShutdownOptions) {
  let shuttingDown: Promise<void> | undefined

  return (reason: string): Promise<void> => {
    shuttingDown ??= new Promise<void>((resolve) => {
      logger.info({ reason }, 'shutting down')
      const timer = setTimeout(() => {
        logger.warn({ timeoutMs }, 'drain timed out, closing connections')
        server.closeAllConnections()
      }, timeoutMs)
      server.close(() => {
        clearTimeout(timer)
        resolve()
      })
      server.closeIdleConnections()
    })
    return shuttingDown
  }
}
