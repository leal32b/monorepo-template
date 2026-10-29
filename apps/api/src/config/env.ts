import { z } from 'zod'

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

/** `noreply@acme.com` or `Acme <noreply@acme.com>`, the two forms email providers accept. */
const SENDER = /^(?:[^<>@]+ <[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/

/** True when `value` is exactly an http(s) origin: scheme, host and port, no path, no trailing slash. */
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value
  } catch {
    return false // not a URL at all, e.g. `*` or a bare host
  }
}

/** An optional value where empty means unset, as an unset GitHub secret arrives. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

const envSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // abort: an invalid origin skips the rules below, which read it.
    WEB_ORIGIN: z.string().refine(isOrigin, { abort: true }),
    BETTER_AUTH_SECRET: z.string().min(32),
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
    PROXY_SECRET: optional(z.string().min(32)),
    RESEND_API_KEY: optional(z.string()),
    EMAIL_FROM: optional(z.string().regex(SENDER))
  })
  // Behind https the API is deployed, and only the web Worker may call it (ADR 0022).
  .refine((env) => env.PROXY_SECRET !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
    path: ['PROXY_SECRET']
  })
  // Resend needs both: a key without a sender, or the reverse, is a mistake.
  .refine((env) => env.RESEND_API_KEY !== undefined || env.EMAIL_FROM === undefined, { path: ['RESEND_API_KEY'] })
  .refine((env) => env.EMAIL_FROM !== undefined || env.RESEND_API_KEY === undefined, { path: ['EMAIL_FROM'] })
  // Deployed, email must really go out: the log transport would drop it silently (ADR 0021).
  .refine((env) => env.RESEND_API_KEY !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
    path: ['RESEND_API_KEY']
  })

/** How email leaves the API (ADR 0021): logged in development, or sent through Resend. */
export type EmailTransport = { kind: 'log' } | { kind: 'resend'; apiKey: string; from: string }

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
  /** Better Auth's secret (ADR 0020): it signs session cookies and encrypts secrets at rest. */
  authSecret: string
  email: EmailTransport
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
  const env = result.data
  return {
    databaseUrl: env.DATABASE_URL,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    webOrigin: env.WEB_ORIGIN,
    corsOrigins: env.CORS_ORIGINS,
    proxySecret: env.PROXY_SECRET,
    authSecret: env.BETTER_AUTH_SECRET,
    // The rules above allow both or neither.
    email:
      env.RESEND_API_KEY === undefined
        ? { kind: 'log' }
        : { kind: 'resend', apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM as string }
  }
}
