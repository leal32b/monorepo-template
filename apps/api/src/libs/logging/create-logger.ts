import pino, { type DestinationStream, type Level, type Logger } from 'pino'

export type LoggerOptions = {
  level: Level | 'silent'
  /** Which process writes: `api` or `migrate`. */
  service: string
  /** The version running (ADR 0046), so a line points at the commit that wrote it. */
  release: string
}

/**
 * The one logger of a process (ADR 0046): JSON lines on stdout for the host to collect, each with
 * pino's time, level, pid and hostname, and the service and release. Headers and bodies are never
 * logged; a request is found by its `reqId`.
 */
export function createLogger({ level, service, release }: LoggerOptions, destination?: DestinationStream): Logger {
  return pino({ level }, destination ?? pino.destination(1)).child({ service, release })
}
