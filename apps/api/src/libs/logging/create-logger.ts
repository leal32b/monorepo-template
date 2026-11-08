import pino, { type DestinationStream, type Level, type Logger } from 'pino'

export type LoggerOptions = {
  level: Level | 'silent'
  /** Which process writes: `api` or `migrate`. */
  service: string
  /** The version running (ADR 0046), so a line points at the commit that wrote it. */
  release: string
}

/** The secrets a header holds: the session, a bearer token, the Worker's secret (ADR 0022). */
const secretHeaders = ['authorization', 'cookie', '["set-cookie"]', '["x-proxy-secret"]']
/** Where a database driver keeps its credentials. */
const secretFields = ['connectionString', 'password']

/**
 * What a library may attach to an error it throws (its request's or response's headers, its
 * config), one and two levels below the logged key (`err.headers`, `err.response.headers`,
 * `err.config`). The rule that headers and connection strings are never logged stays the first
 * defence; this is the second.
 */
const redactedPaths = [
  ...secretHeaders.flatMap((header) => [`*.headers.${header}`, `*.*.headers.${header}`]),
  ...secretFields.flatMap((field) => [`*.${field}`, `*.*.${field}`])
]

/**
 * The one logger of a process (ADR 0046): JSON lines on stdout for the host to collect, each with
 * pino's time, level, pid and hostname, and the service and release. Headers and bodies are never
 * logged; a request is found by its `reqId`. Secrets a library error carries are redacted.
 */
export function createLogger({ level, service, release }: LoggerOptions, destination?: DestinationStream): Logger {
  return pino({ level, redact: redactedPaths }, destination ?? pino.destination(1)).child({ service, release })
}
