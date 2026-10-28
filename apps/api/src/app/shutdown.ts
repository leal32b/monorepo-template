import type { Server } from 'node:http'
import type { Logger } from 'pino'

export type ShutdownOptions = {
  server: Server
  logger: Logger
  /** How long in-flight requests may take before their connections are cut. */
  timeoutMs: number
  /** Frees what requests used (the database pool), once none is in flight. */
  release?: () => Promise<void>
}

/**
 * Graceful shutdown: stop accepting connections, let in-flight requests finish, drop idle
 * keep-alive connections, and cut whatever is still open after `timeoutMs`. Then `release`
 * runs once; its failure is logged so the process can still exit.
 * Idempotent: every call returns the same promise.
 */
export function createShutdown({ server, logger, timeoutMs, release = async () => {} }: ShutdownOptions) {
  let shuttingDown: Promise<void> | undefined

  return (reason: string): Promise<void> => {
    shuttingDown ??= new Promise<void>((resolve) => {
      logger.info({ reason }, 'shutting down')
      const timer = setTimeout(() => {
        logger.warn({ timeoutMs }, 'drain timed out, closing connections')
        server.closeAllConnections()
      }, timeoutMs)
      // A connection becomes idle only when its last request ends, so sweep until the server closes.
      const sweep = setInterval(() => server.closeIdleConnections(), 100)
      server.close(() => {
        clearTimeout(timer)
        clearInterval(sweep)
        resolve()
      })
      server.closeIdleConnections()
    })
      .then(release)
      .catch((err: unknown) => logger.error({ err }, 'releasing resources failed'))
    return shuttingDown
  }
}
