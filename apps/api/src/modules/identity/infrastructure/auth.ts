import { passwordLength } from '@repo/contracts'
import { betterAuth } from 'better-auth'
import { haveIBeenPwned, twoFactor } from 'better-auth/plugins'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import * as z from 'zod/mini'
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
  /** Google sign-in, on only when it is configured (ADR 0020). */
  google: { clientId: string; clientSecret: string } | undefined
}

/** The languages emails are written in: a sign-up in any other is refused. */
const localeSchema = z.enum(Object.keys(emailTexts) as [Locale, ...Locale[]])

/** Better Auth with the template's defaults (ADR 0020). */
export function createAuth({ db, logger, emailSender, webOrigin, secret, google }: AuthDeps) {
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
    // Errors of browser flows, such as an OAuth callback, land on the sign-in page with `?error=`.
    onAPIError: { errorURL: `${webOrigin}/login` },
    database: { db, type: 'postgres', schemaName: 'auth' },
    user: {
      additionalFields: {
        locale: { type: 'string', required: true, defaultValue: 'en', input: true, validator: { input: localeSchema } }
      },
      // T09: an account from a provider counts only with an email the provider has confirmed.
      validateUserInfo: ({ user, source }) =>
        source.method === 'oauth' && user.emailVerified !== true ? { error: 'email_not_verified' } : undefined
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      // The limits the web shows before the user types (NIST SP 800-63B-4).
      minPasswordLength: passwordLength.min,
      maxPasswordLength: passwordLength.max,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: async ({ user, url }) => send('resetPassword', user, url),
      // Whoever had the old password is signed out everywhere (T10).
      revokeSessionsOnPasswordReset: true,
      // The same answer as a new sign-up; only the owner of the address learns of the attempt (T08).
      onExistingUserSignUp: async ({ user }) => send('alreadyRegistered', user, `${webOrigin}/login`)
    },
    // Linked to an existing account only when both sides confirmed the email (requireLocalEmailVerified).
    ...(google === undefined ? {} : { socialProviders: { google } }),
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
    plugins: [
      // Fails closed: while the service cannot be reached, sign-up and password changes answer 500.
      haveIBeenPwned(),
      // TOTP and backup codes for email-and-password sign-in; the issuer names the app in authenticators.
      twoFactor({ issuer: 'Monorepo Template' })
    ]
  })
}

export type Auth = ReturnType<typeof createAuth>
