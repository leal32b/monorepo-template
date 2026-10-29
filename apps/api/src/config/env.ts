import { z } from 'zod'

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

/** True when `value` is exactly an http(s) origin: scheme, host and port, no path, no trailing slash. */
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value
  } catch {
    return false // not a URL at all, e.g. `*` or a bare host
  }
}

const envSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // abort: an invalid origin skips the PROXY_SECRET rule below, which reads it.
    WEB_ORIGIN: z.string().refine(isOrigin, { abort: true }),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      )
      .pipe(z.array(z.string().refine(isOrigin))),
    // Empty means unset, as an unset GitHub secret arrives.
    PROXY_SECRET: z.preprocess((value) => (value === '' ? undefined : value), z.string().min(32).optional())
  })
  // Behind https the API is deployed, and only the web Worker may call it (ADR 0022).
  .refine((env) => env.PROXY_SECRET !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
    path: ['PROXY_SECRET']
  })

export type ApiEnv = {
  /** Postgres connection string (ADR 0013). It holds the password: never log it. */
  databaseUrl: string
  host: string
  port: number
  logLevel: (typeof LOG_LEVELS)[number]
  /** The web app's origin (ADR 0019): the only origin allowed to send writes. */
  webOrigin: string
  /** Web origins allowed to read API responses (ADR 0015). Empty: same origin only. */
  corsOrigins: string[]
  /** Secret the web Worker sends (ADR 0022). Unset in development: every caller is served. */
  proxySecret: string | undefined
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
  const { DATABASE_URL, WEB_ORIGIN, HOST, PORT, LOG_LEVEL, CORS_ORIGINS, PROXY_SECRET } = result.data
  return {
    databaseUrl: DATABASE_URL,
    host: HOST,
    port: PORT,
    logLevel: LOG_LEVEL,
    webOrigin: WEB_ORIGIN,
    corsOrigins: CORS_ORIGINS,
    proxySecret: PROXY_SECRET
  }
}
