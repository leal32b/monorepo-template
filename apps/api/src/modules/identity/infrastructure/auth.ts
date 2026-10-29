import { betterAuth } from 'better-auth'
import { haveIBeenPwned } from 'better-auth/plugins'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import { z } from 'zod'
import type { EmailSender } from '#libs/ports/email-sender.port'
import { type EmailKind, emailTexts, type Locale } from '../emails/email-texts'
import { writeEmail } from '../emails/write-email'
import { hashPassword, verifyPassword } from './password-hashing'

export type AuthDeps = {
  db: Kysely<unknown>
  logger: Logger
  emailSender: EmailSender
  /** The web app's origin (ADR 0019): every link and callback comes through it. */
  webOrigin: string
  /** `BETTER_AUTH_SECRET`: signs the session cookies. */
  secret: string
}

/** The languages emails are written in: a sign-up in any other is refused. */
const localeSchema = z.enum(Object.keys(emailTexts) as [Locale, ...Locale[]])

/** Better Auth with the template's defaults (ADR 0020). */
export function createAuth({ db, logger, emailSender, webOrigin, secret }: AuthDeps) {
  /** Not awaited, so a slow provider changes no response time; a failure is logged (ADR 0021). */
  const send = (kind: EmailKind, user: { email: string }, url: string) => {
    const { email, locale } = user as { email: string; locale: Locale } // `locale` is our additional field
    void emailSender.send(writeEmail(kind, { to: email, locale, url })).catch((err: unknown) => {
      logger.error({ err, kind }, 'email not sent')
    })
  }

  return betterAuth({
    baseURL: webOrigin,
    basePath: '/api/auth',
    secret,
    trustedOrigins: [webOrigin],
    database: { db, type: 'postgres', schemaName: 'auth' },
    user: {
      additionalFields: {
        locale: { type: 'string', required: true, defaultValue: 'en', input: true, validator: { input: localeSchema } }
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      // NIST SP 800-63B-4: 15 characters when the password is the only factor, no composition rules.
      minPasswordLength: 15,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => send('resetPassword', user, url),
      // Whoever had the old password is signed out everywhere (T10).
      revokeSessionsOnPasswordReset: true,
      // The same answer as a new sign-up; only the owner of the address learns of the attempt (T08).
      onExistingUserSignUp: async ({ user }) => send('alreadyRegistered', user, `${webOrigin}/login`)
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => send('confirmEmail', user, url)
    },
    // Every request reads the session row: GHSA-xg6x-h9c9-2m83 came from this cache.
    session: { cookieCache: { enabled: false } },
    // Counters in Postgres survive a restart; the client is the IP the Worker reports (ADR 0022).
    rateLimit: { enabled: true, storage: 'database' },
    advanced: { ipAddress: { ipAddressHeaders: ['x-client-ip'] } },
    // At `info` Better Auth logs email addresses.
    logger: { level: 'warn', log: (level, message, ...args) => logger[level]({ args }, message) },
    telemetry: { enabled: false },
    // Fails closed: while the service cannot be reached, sign-up and password changes answer 500.
    plugins: [haveIBeenPwned()]
  })
}

export type Auth = ReturnType<typeof createAuth>
