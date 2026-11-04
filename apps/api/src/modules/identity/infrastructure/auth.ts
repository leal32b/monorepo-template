import { builtInRoles, passwordLength, statements } from '@repo/contracts'
import { betterAuth } from 'better-auth'
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { haveIBeenPwned, organization, twoFactor } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import type { Kysely } from 'kysely'
import type { Logger } from 'pino'
import * as z from 'zod/mini'
import type { EmailSender } from '#libs/ports/email-sender.port'
import { type EmailKind, emailTexts, type Locale } from '../emails/email-texts'
import { writeEmail } from '../emails/write-email'
import { checkOrganization, OrganizationReader, OrganizationRules, organizationLimits } from './organization-rules'
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

/** The access control of ADR 0033, built from the statements and built-in roles in `@repo/contracts`. */
const accessControl = createAccessControl(statements)
const roles = {
  owner: accessControl.newRole(builtInRoles.owner),
  admin: accessControl.newRole(builtInRoles.admin),
  member: accessControl.newRole(builtInRoles.member)
}

/** Better Auth with the template's defaults (ADR 0020). */
export function createAuth({ db, logger, emailSender, webOrigin, secret, google }: AuthDeps) {
  /** Not awaited, so a slow provider changes no response time; a failure is logged (ADR 0021). */
  const send = (kind: EmailKind, user: { email: string }, url: string, values?: Record<string, string>) => {
    const { email, locale } = user as { email: string; locale: Locale } // `locale` is our additional field
    void emailSender.send(writeEmail(kind, { to: email, locale, url, values })).catch((err: unknown) => {
      logger.error({ err, kind }, 'email not sent')
    })
  }
  const rules = new OrganizationRules(new OrganizationReader(db))

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
    rateLimit: {
      enabled: true,
      storage: 'database',
      // Invitations send email: per client address, on top of the per-inviter count (ADR 0033, D6).
      customRules: { '/organization/invite-member': { window: 60, max: organizationLimits.invitationsPerMinute } }
    },
    advanced: { ipAddress: { ipAddressHeaders: ['x-client-ip'] } },
    // At `info` Better Auth logs email addresses.
    logger: { level: 'warn', log: (level, message, ...args) => logger[level]({ args }, message) },
    telemetry: { enabled: false },
    hooks: {
      // The organization plugin's own hooks do not all see the caller; these checks need it (ADR 0033).
      before: createAuthMiddleware(async (ctx) => {
        if (!OrganizationRules.guardedPaths.has(ctx.path)) return
        const session = await getSessionFromCtx(ctx)
        await rules.before(ctx.path, ctx.body, session?.user.id) // every guarded path is a POST with a body
      })
    },
    plugins: [
      // Fails closed: while the service cannot be reached, sign-up and password changes answer 500.
      haveIBeenPwned(),
      // TOTP and backup codes for email-and-password sign-in; the issuer names the app in authenticators.
      twoFactor({ issuer: 'Monorepo Template' }),
      // Organizations, members, roles in the database and invitations (ADR 0033); teams stay off.
      organization({
        ac: accessControl,
        roles,
        dynamicAccessControl: {
          enabled: true,
          maximumRolesPerOrganization: organizationLimits.customRolesPerOrganization
        },
        organizationLimit: organizationLimits.organizationsPerUser,
        membershipLimit: organizationLimits.membersPerOrganization,
        invitationExpiresIn: organizationLimits.invitationExpiresInDays * 24 * 60 * 60,
        // Off by default with Better Auth's ids: only a confirmed address may use its invitation (D5).
        requireEmailVerificationOnInvitation: true,
        cancelPendingInvitationsOnReInvite: true,
        // Written in the inviter's language; the inviter is named with the address they confirmed.
        sendInvitationEmail: async ({ id, email, organization, inviter }) =>
          send(
            'invitation',
            { email, locale: (inviter.user as { locale?: Locale }).locale } as { email: string },
            `${webOrigin}/invitations/${id}`,
            {
              organization: organization.name,
              inviter: `${inviter.user.name} (${inviter.user.email})`
            }
          ),
        organizationHooks: {
          beforeCreateOrganization: async ({ organization }) => checkOrganization(organization),
          beforeUpdateOrganization: async ({ organization }) => checkOrganization(organization),
          beforeCreateInvitation: async ({ inviter }) => rules.beforeInvitation(inviter.id),
          beforeDeleteOrganization: async ({ organization, user }) => rules.beforeDeletion(organization.id, user.id)
        }
      })
    ]
  })
}

export type Auth = ReturnType<typeof createAuth>
