import * as z from 'zod/mini'

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

/** `noreply@acme.com` or `Acme <noreply@acme.com>`, the two forms email providers accept. */
const SENDER = /^(?:[^<>@]+ <[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/

/** A commit SHA, a tag or `dev`: letters, digits, `.`, `_` and `-` only, as it is logged on every line. */
const RELEASE = /^[\w.-]{1,64}$/

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
const optional = <T extends z.ZodMiniType>(schema: T) =>
  z.pipe(
    z.transform((value) => (value === '' ? undefined : value)),
    z.optional(schema)
  )

const databaseUrl = z.url({ protocol: /^postgres(ql)?$/ })
const logLevel = z._default(z.enum(LOG_LEVELS), 'info')
const release = optional(z.string().check(z.regex(RELEASE)))

const envSchema = z
  .object({
    DATABASE_URL: databaseUrl,
    DATABASE_POOL_SIZE: optional(z.pipe(z.coerce.number(), z.int().check(z.gte(1), z.lte(100)))),
    // abort: an invalid origin skips the rules below, which read it.
    WEB_ORIGIN: z.string().check(z.refine(isOrigin, { abort: true })),
    BETTER_AUTH_SECRET: z.string().check(z.minLength(32)),
    HOST: z._default(z.string().check(z.minLength(1)), '127.0.0.1'),
    PORT: z._default(z.pipe(z.coerce.number(), z.int().check(z.gte(1), z.lte(65535))), 3001),
    LOG_LEVEL: logLevel,
    RELEASE: release,
    CORS_ORIGINS: z.pipe(
      z.pipe(
        z._default(z.string(), ''),
        z.transform((value) =>
          value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        )
      ),
      z.array(z.string().check(z.refine(isOrigin)))
    ),
    PROXY_SECRET: optional(z.string().check(z.minLength(32))),
    RESEND_API_KEY: optional(z.string()),
    EMAIL_FROM: optional(z.string().check(z.regex(SENDER))),
    GOOGLE_CLIENT_ID: optional(z.string()),
    GOOGLE_CLIENT_SECRET: optional(z.string()),
    JOB_WORKER: optional(z.enum(['on', 'off'])),
    JOB_IDLE_POLL_SECONDS: optional(z.pipe(z.coerce.number(), z.int().check(z.gte(1), z.lte(86_400))))
  })
  .check(
    // Behind https the API is deployed, and only the web Worker may call it (ADR 0022).
    z.refine((env) => env.PROXY_SECRET !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
      path: ['PROXY_SECRET']
    }),
    // Resend needs both: a key without a sender, or the reverse, is a mistake.
    z.refine((env) => env.RESEND_API_KEY !== undefined || env.EMAIL_FROM === undefined, { path: ['RESEND_API_KEY'] }),
    z.refine((env) => env.EMAIL_FROM !== undefined || env.RESEND_API_KEY === undefined, { path: ['EMAIL_FROM'] }),
    // Deployed, email must really go out: the log transport would drop it silently (ADR 0021).
    z.refine((env) => env.RESEND_API_KEY !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
      path: ['RESEND_API_KEY']
    }),
    // Google needs both, as Resend does.
    z.refine((env) => env.GOOGLE_CLIENT_ID !== undefined || env.GOOGLE_CLIENT_SECRET === undefined, {
      path: ['GOOGLE_CLIENT_ID']
    }),
    z.refine((env) => env.GOOGLE_CLIENT_SECRET !== undefined || env.GOOGLE_CLIENT_ID === undefined, {
      path: ['GOOGLE_CLIENT_SECRET']
    })
  )

/** How email leaves the API (ADR 0021): logged in development, or sent through Resend. */
export type EmailTransport = { kind: 'log' } | { kind: 'resend'; apiKey: string; from: string }

export type ApiEnv = {
  /** Postgres connection string (ADR 0013). It holds the password: never log it. */
  databaseUrl: string
  /** Connections the API's pool opens; unset, the pool's own five (ADR 0047). One over a local PGlite (ADR 0055). */
  databasePoolSize: number | undefined
  host: string
  port: number
  logLevel: (typeof LOG_LEVELS)[number]
  /** The version running (ADR 0046): set by the image build, `dev` when unset. */
  release: string
  /** The web app's origin (ADR 0019): the only origin allowed to send writes. */
  webOrigin: string
  /** Web origins allowed to read API responses (ADR 0015). Empty: same origin only. */
  corsOrigins: string[]
  /** Secret the web Worker sends (ADR 0022). Unset in development: every caller is served. */
  proxySecret: string | undefined
  /** Better Auth's secret (ADR 0020): it signs session cookies and encrypts secrets at rest. */
  authSecret: string
  email: EmailTransport
  /** Google sign-in (ADR 0020): off unless both credentials are set. */
  google: { clientId: string; clientSecret: string } | undefined
  /**
   * Background work (ADR 0056). `worker`: whether this process runs the jobs; off when a process of
   * its own does (`dist/worker.js`). `idlePollMs`: the longest an idle worker sleeps before it looks
   * again; an hour where the API enqueues and runs, a few seconds for a worker in its own process.
   */
  jobs: { worker: boolean; idlePollMs: number }
}

/** Names the invalid variables, never their values (a wrong value may be a secret). */
export class EnvError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid environment: ${variables.join(', ')}`)
    this.name = 'EnvError'
  }
}

/** The parsed environment, or an `EnvError` naming what is wrong. */
function parse<T extends z.ZodMiniType>(schema: T, source: Record<string, string | undefined>): z.output<T> {
  const result = schema.safeParse(source)
  if (!result.success) {
    throw new EnvError([...new Set(result.error.issues.map((issue) => String(issue.path[0])))])
  }
  return result.data
}

/** What a job that only talks to the database needs, such as the purge (ADR 0050). */
export type DatabaseEnv = Pick<ApiEnv, 'databaseUrl' | 'logLevel' | 'release'>

/** The database's part of the environment: a job run away from the API needs none of its secrets. */
export function loadDatabaseEnv(source: Record<string, string | undefined>): DatabaseEnv {
  const env = parse(z.object({ DATABASE_URL: databaseUrl, LOG_LEVEL: logLevel, RELEASE: release }), source)
  return { databaseUrl: env.DATABASE_URL, logLevel: env.LOG_LEVEL, release: env.RELEASE ?? 'dev' }
}

export function loadEnv(source: Record<string, string | undefined>): ApiEnv {
  const env = parse(envSchema, source)
  return {
    databaseUrl: env.DATABASE_URL,
    databasePoolSize: env.DATABASE_POOL_SIZE,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    release: env.RELEASE ?? 'dev',
    webOrigin: env.WEB_ORIGIN,
    corsOrigins: env.CORS_ORIGINS,
    proxySecret: env.PROXY_SECRET,
    authSecret: env.BETTER_AUTH_SECRET,
    // The rules above allow both or neither.
    email:
      env.RESEND_API_KEY === undefined
        ? { kind: 'log' }
        : { kind: 'resend', apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM as string },
    google:
      env.GOOGLE_CLIENT_ID === undefined
        ? undefined
        : { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET as string },
    jobs: { worker: env.JOB_WORKER !== 'off', idlePollMs: (env.JOB_IDLE_POLL_SECONDS ?? 3_600) * 1000 }
  }
}
