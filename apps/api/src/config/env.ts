import { z } from 'zod'

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

const envSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info')
})

export type ApiEnv = {
  host: string
  port: number
  logLevel: (typeof LOG_LEVELS)[number]
}

/** Names the invalid variables, never their values (a wrong value may be a secret). */
export class EnvError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid environment: ${variables.join(', ')}`)
    this.name = 'EnvError'
  }
}

export function loadEnv(source: Record<string, string | undefined>): ApiEnv {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new EnvError([...new Set(result.error.issues.map((issue) => String(issue.path[0])))])
  }
  const { HOST, PORT, LOG_LEVEL } = result.data
  return { host: HOST, port: PORT, logLevel: LOG_LEVEL }
}
