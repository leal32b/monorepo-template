import * as z from 'zod/mini'

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const

/** `noreply@acme.com` or `Acme <noreply@acme.com>`, the two forms email providers accept. */
const SENDER = /^(?:[^<>@]+ <[^\s<>@]+@[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+)$/

/** A commit SHA, a tag or `dev`: letters, digits, `.`, `_` and `-` only, as it is logged on every line. */
const RELEASE = /^[\w.-]{1,64}$/

/**
 * Asaas's two environments (ADR 0064), each with the prefix of its keys: a key is refused on the other's
 * URL, so a sandbox key never meets production and the reverse.
 */
const ASAAS_KEY_PREFIXES: Record<string, string> = {
  'https://api-sandbox.asaas.com/v3': '$aact_hmlg_',
  'https://api.asaas.com/v3': '$aact_prod_'
}

/** True when `value` is exactly an http(s) origin: scheme, host and port, no path, no trailing slash. */
function isOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value
  } catch {
    return false // not a URL at all, e.g. `*` or a bare host
  }
}

/** An S3 API's origin (ADR 0076): https, a host and nothing after it; the bucket is a variable of its own. */
const isHttpsOrigin = (value: string) => isOrigin(value) && value.startsWith('https:')

/** What selects the S3 store (ADR 0076), all four or none; `STORAGE_REGION` has a default. */
const STORAGE_VARIABLES = [
  'STORAGE_ENDPOINT',
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY'
] as const
type StorageVariables = { [Name in (typeof STORAGE_VARIABLES)[number]]?: string | undefined }

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
    FAKE_BILLING_TOKEN: optional(z.string().check(z.minLength(16))),
    ASAAS_API_KEY: optional(z.string()),
    ASAAS_API_URL: optional(z.enum(Object.keys(ASAAS_KEY_PREFIXES))),
    // Asaas's own rules for a webhook's token: 32 to 255 characters, no spaces.
    ASAAS_WEBHOOK_TOKEN: optional(z.string().check(z.minLength(32), z.maxLength(255), z.regex(/^\S+$/))),
    STORAGE_ENDPOINT: optional(z.string().check(z.refine(isHttpsOrigin))),
    STORAGE_BUCKET: optional(z.string().check(z.regex(/^[a-z0-9][a-z0-9.-]{1,62}$/))),
    STORAGE_REGION: optional(z.string().check(z.regex(/^[a-z0-9-]{1,32}$/))),
    STORAGE_ACCESS_KEY_ID: optional(z.string()),
    STORAGE_SECRET_ACCESS_KEY: optional(z.string()),
    STORAGE_DIR: optional(z.string()),
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
    }),
    // Asaas needs its URL and the token of its notices with the key; either without the key is a mistake.
    z.refine((env) => env.ASAAS_API_KEY === undefined || env.ASAAS_API_URL !== undefined, { path: ['ASAAS_API_URL'] }),
    z.refine((env) => env.ASAAS_API_KEY === undefined || env.ASAAS_WEBHOOK_TOKEN !== undefined, {
      path: ['ASAAS_WEBHOOK_TOKEN']
    }),
    z.refine(
      (env) =>
        env.ASAAS_API_KEY !== undefined || (env.ASAAS_API_URL === undefined && env.ASAAS_WEBHOOK_TOKEN === undefined),
      { path: ['ASAAS_API_KEY'] }
    ),
    // A key works only in its own environment: the prefix names it (ADR 0064).
    z.refine(
      (env) => {
        const prefix = env.ASAAS_API_URL === undefined ? undefined : ASAAS_KEY_PREFIXES[env.ASAAS_API_URL]
        return env.ASAAS_API_KEY === undefined || prefix === undefined || env.ASAAS_API_KEY.startsWith(prefix)
      },
      { path: ['ASAAS_API_KEY'] }
    ),
    // The token travels in every notice: it must never be the key (Asaas's rule).
    z.refine((env) => env.ASAAS_WEBHOOK_TOKEN === undefined || env.ASAAS_WEBHOOK_TOKEN !== env.ASAAS_API_KEY, {
      path: ['ASAAS_WEBHOOK_TOKEN']
    }),
    // A store needs its endpoint, its bucket and both keys (ADR 0076): one without the others is a mistake.
    ...STORAGE_VARIABLES.map((name) =>
      z.refine<StorageVariables>(
        (env) => env[name] !== undefined || !STORAGE_VARIABLES.some((v) => env[v] !== undefined),
        {
          path: [name]
        }
      )
    ),
    // Deployed, files must outlive a deploy: the local folder is erased with the host's disk (ADR 0076).
    z.refine((env) => env.STORAGE_ENDPOINT !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
      path: ['STORAGE_ENDPOINT']
    }),
    // Deployed, payments must be real: the fake marks an organization paid on a command (ADR 0063). A
    // provider's key selects its adapter (ADR 0064); with none configured, the fake is all there is.
    z.refine((env) => env.ASAAS_API_KEY !== undefined || !env.WEB_ORIGIN.startsWith('https:'), {
      path: ['ASAAS_API_KEY']
    })
  )

/**
 * Who takes the payments (ADR 0063): the provider whose key is set, or the fake with none, driven by
 * commands that carry `FAKE_BILLING_TOKEN` (every command is refused while it is unset).
 */
export type BillingConfig =
  | { kind: 'fake'; token: string | undefined }
  /** Asaas (ADR 0064): the key (a secret, never logged), its environment's URL and the token its notices carry. */
  | { kind: 'asaas'; apiKey: string; apiUrl: string; webhookToken: string }

/**
 * Where files live (ADR 0076): a folder in development and tests, or an S3-compatible store (R2 by default).
 * The secret key signs in memory, never logged, never in an address.
 */
export type StorageConfig =
  | { kind: 'local'; dir: string }
  | { kind: 's3'; endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string }

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
  billing: BillingConfig
  storage: StorageConfig
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
    // The rules above require the URL and the token with the key.
    billing:
      env.ASAAS_API_KEY === undefined
        ? { kind: 'fake', token: env.FAKE_BILLING_TOKEN }
        : {
            kind: 'asaas',
            apiKey: env.ASAAS_API_KEY,
            apiUrl: env.ASAAS_API_URL as string,
            webhookToken: env.ASAAS_WEBHOOK_TOKEN as string
          },
    // The rules above allow all four or none.
    storage:
      env.STORAGE_ENDPOINT === undefined
        ? { kind: 'local', dir: env.STORAGE_DIR ?? '.storage' }
        : {
            kind: 's3',
            endpoint: env.STORAGE_ENDPOINT,
            bucket: env.STORAGE_BUCKET as string,
            region: env.STORAGE_REGION ?? 'auto',
            accessKeyId: env.STORAGE_ACCESS_KEY_ID as string,
            secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY as string
          },
    jobs: { worker: env.JOB_WORKER !== 'off', idlePollMs: (env.JOB_IDLE_POLL_SECONDS ?? 3_600) * 1000 }
  }
}
