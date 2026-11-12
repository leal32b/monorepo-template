import { can } from '@repo/contracts'
import { Navigate, type RouteDefinition, type RoutePreloadFuncArgs, useParams } from '@solidjs/router'
import { lazy } from 'solid-js'
import { ForgotPasswordPage } from '#pages/forgot-password'
import { NotFoundPage } from '#pages/not-found'
import { ResetPasswordPage } from '#pages/reset-password'
import { SignInPage } from '#pages/sign-in'
import { SignUpPage } from '#pages/sign-up'
import { TwoFactorPage } from '#pages/two-factor'
import { type ApiClient, type AuthClient, useApi, useAuth } from '#shared/api'
import { AccountRedirect } from './account-redirect'

/**
 * What a visitor needs (the entry screens) is in the first download; what only someone signed in
 * needs (the session guard with the side menu, the menus, the palette and the screens behind it) loads
 * when they get there, so opening the sign-in does not pay for Kobalte's dialogs and menus. Behind the
 * session, a screen whose code is not loaded yet keeps the page on view a moment, under the session
 * guard's `Suspense`; its data never does (ADR 0038). The security screen is the heaviest of those (QR
 * code, backup codes, every security form), so it loads on its own.
 */
const RequireSession = lazy(() => import('./require-session').then((m) => ({ default: m.RequireSession })))
const OrganizationsProvider = lazy(() =>
  import('#entities/organizations').then((m) => ({ default: m.OrganizationsProvider }))
)
const OrganizationRedirect = lazy(() =>
  import('./organization-redirect').then((m) => ({ default: m.OrganizationRedirect }))
)
const AppFrame = lazy(() => import('#widgets/app-shell').then((m) => ({ default: m.AppFrame })))
const RequireOrganization = lazy(() =>
  import('./require-organization').then((m) => ({ default: m.RequireOrganization }))
)
const CustomersPage = lazy(() => import('#pages/customers').then((m) => ({ default: m.CustomersPage })))
const HomePage = lazy(() => import('#pages/home').then((m) => ({ default: m.HomePage })))
const OrganizationGeneralPage = lazy(() =>
  import('#pages/organization-general').then((m) => ({ default: m.OrganizationGeneralPage }))
)
const OrganizationMembersPage = lazy(() =>
  import('#pages/organization-members').then((m) => ({ default: m.OrganizationMembersPage }))
)
const OrganizationRolesPage = lazy(() =>
  import('#pages/organization-roles').then((m) => ({ default: m.OrganizationRolesPage }))
)
const OrganizationActivityPage = lazy(() =>
  import('#pages/organization-activity').then((m) => ({ default: m.OrganizationActivityPage }))
)
const InvitationPage = lazy(() => import('#pages/invitation').then((m) => ({ default: m.InvitationPage })))
const OnboardingPage = lazy(() => import('#pages/onboarding').then((m) => ({ default: m.OnboardingPage })))
const ProfilePage = lazy(() => import('#pages/profile').then((m) => ({ default: m.ProfilePage })))
const DeleteAccountPage = lazy(() => import('#pages/delete-account').then((m) => ({ default: m.DeleteAccountPage })))
const PreferencesPage = lazy(() => import('#pages/preferences').then((m) => ({ default: m.PreferencesPage })))
const SecurityPage = lazy(() => import('#pages/security').then((m) => ({ default: m.SecurityPage })))
/** A tenant's public page, a chunk of its own: neither the sign-in nor the signed-in screens download it (ADR 0060). */
const PublicOrganizationPage = lazy(() =>
  import('#pages/public-organization').then((m) => ({ default: m.PublicOrganizationPage }))
)

/**
 * A screen's reads start in its route, as soon as the router opens it (ADR 0038): the session and the
 * organizations together at boot, a screen's own reads beside them, all but the session only where a session
 * was seen on this device, so a visitor's console shows no refused call (ADR 0042). The entities' code loads on demand, as
 * the screens' does, so a read starts once its code is in; a read that fails is said by the screen that
 * reads it.
 */
const preload = <Entity,>(
  entity: () => Promise<Entity>,
  start: (loaded: Entity, clients: { auth: AuthClient; api: ApiClient }) => unknown,
  { needsSession = true }: { needsSession?: boolean } = {}
) => {
  const clients = { auth: useAuth(), api: useApi() }
  Promise.all([entity(), sessions()])
    .then(([loaded, { hasSession }]) => {
      // Where no session was seen on this device, only the session is asked: the rest would be refused for
      // a visitor, and the browser's console would show it. The guard asks for them once the session
      // answers (ADR 0042).
      // Returned, so a read that fails is caught below and nothing is left unhandled.
      return !needsSession || hasSession() ? start(loaded, clients) : undefined
    })
    .catch(() => undefined)
}
/**
 * A route's reads, started when the router opens it: the first load, a click, a move back or forward. A
 * link only hovered, focused or touched loads its screen's code and none of its data, so the API is asked
 * only for the screens the user opens (ADR 0040).
 */
const onOpen =
  (start: (args: RoutePreloadFuncArgs) => void) =>
  (args: RoutePreloadFuncArgs): void => {
    if (args.intent !== 'preload') start(args)
  }
const sessions = () => import('#entities/sessions')
const organizations = () => import('#entities/organizations')
const accounts = () => import('#entities/accounts')
const preloadSession = onOpen(() =>
  preload(sessions, (entity, { auth }) => entity.sessionQuery(auth)(), { needsSession: false })
)
const preloadOrganizations = onOpen(() =>
  preload(organizations, (entity, { auth }) => entity.organizationsQuery(auth)())
)
/**
 * The members and roles screens' lists start as soon as the organization is known, beside its membership.
 * The slug is read now: the router's parameters change only once its transition commits.
 */
const preloadTeam = onOpen(({ params }) => {
  const slug = params.orgSlug as string
  preload(organizations, (entity, { auth }) => entity.preloadTeam(auth, slug))
})
/**
 * The first page of the customers starts as soon as the organization the address names is known (ADR 0038).
 * The slug is read now, as `preloadTeam` reads it. An address naming none of the user's organizations asks for nothing.
 */
const preloadCustomers = onOpen(({ params }) => {
  const slug = params.orgSlug as string
  preload(organizations, async (entity, { auth, api }) => {
    const organization = (await entity.organizationsQuery(auth)()).find((candidate) => candidate.slug === slug)
    if (organization === undefined) return
    const { customersQuery } = await import('#entities/customers')
    await customersQuery(api)(organization.id, 'active', '', 1)
  })
})
/**
 * The newest page of the organization's activity starts as soon as the organization is known (ADR 0061), and
 * only for a role that holds `audit:read`: the preload waits for the membership the frame reads anyway (one
 * request for both), so a plain member's console shows no refused call (ADR 0042), and the screen says why
 * from the membership alone.
 */
const preloadActivity = onOpen(({ params }) => {
  const slug = params.orgSlug as string
  preload(organizations, async (entity, { auth, api }) => {
    const organization = (await entity.organizationsQuery(auth)()).find((candidate) => candidate.slug === slug)
    if (organization === undefined) return
    const membership = await entity.membershipQuery(api)(organization.id)
    if (!can(membership.permissions, 'audit', 'read')) return
    const { auditEntriesQuery } = await import('#entities/audit-entries')
    await auditEntriesQuery(api)(organization.id, '')
  })
})
const identityOptions = () => import('#entities/identity-options')
/** The security screen reads the ways to sign in, and whether the API has Google for the Google row. */
const preloadSecurity = onOpen(() => {
  preload(accounts, (entity, { auth }) => entity.signInMethodsQuery(auth)())
  preload(identityOptions, (entity, { api }) => entity.identityOptionsQuery(api)())
})
/** The profile and the deletion's confirmation say what deleting the account would do (ADR 0049). */
const preloadAccountDeletion = onOpen(() => preload(accounts, (entity, { api }) => entity.accountDeletionQuery(api)()))
const preloadUserInvitations = onOpen(() =>
  preload(organizations, (entity, { auth }) => entity.userInvitationsQuery(auth)())
)
/** The invitation of a link, read as it opens, its id taken now as `preloadTeam` takes its slug. */
const preloadInvitation = onOpen(({ params }) => {
  const id = params.id as string
  preload(organizations, (entity, { api }) => entity.invitationQuery(api)(id))
})

/**
 * The read of a tenant's public page, started as it opens with the slug read now (ADR 0038). Not through
 * `preload`: a visitor's page never asks for the session, nor reads the device's hint of one (ADR 0060).
 */
const preloadPublic = onOpen(({ params }) => {
  const slug = params.orgSlug as string
  const api = useApi()
  import('#entities/public-organizations')
    .then((entity) => entity.publicOrganizationQuery(api)(slug))
    // A read that fails is said by the page, which reads it again.
    .catch(() => undefined)
})

/** `/:orgSlug/settings` opens on General, as `/settings` opens on the profile. */
function SettingsOfOrganization() {
  const params = useParams<{ orgSlug: string }>()
  return <Navigate href={`/${params.orgSlug}/settings/general`} />
}

/** The entry screens, a visitor's: signing up, signing in and choosing a new password. */
const entryScreens: RouteDefinition[] = [
  { path: '/signup', component: SignUpPage },
  { path: '/login', component: SignInPage },
  { path: '/login/two-factor', component: TwoFactorPage },
  { path: '/forgot-password', component: ForgotPasswordPage },
  { path: '/reset-password', component: ResetPasswordPage }
]

/**
 * Whether the app opens on an entry screen: only those wait, a moment at most, for what the API offers
 * for signing in before their first paint, so Google shows at once or not at all; a signed-in screen
 * never waits for it (ADR 0038).
 */
export const opensOnEntryScreen = (pathname: string) =>
  entryScreens.some((screen) => screen.path === pathname.replace(/(.)\/+$/, '$1'))

/** The organization's slug is the first segment of every tenant screen (ADR 0034). */
export const tenantPath = '/:orgSlug'

/**
 * A tenant's public pages, for a visitor with no account, sit under `/p/:orgSlug` (ADR 0060): outside the
 * session guard, in the entry screens' frame with the organization's name. `p` is a reserved slug.
 */
export const publicPath = '/p/:orgSlug'

/**
 * Every screen of the app. Tenant screens sit under `/:orgSlug`; entry, account, onboarding,
 * invitation and public screens stay outside it, and the words they use are reserved, so no slug can shadow
 * them (`reservedSlugs` in `@repo/contracts`, checked by the routes' test).
 */
export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: RequireSession,
    preload: preloadSession,
    children: [
      {
        // The organizations are read for every screen behind the session, the account settings
        // included: their side menu offers the organization's settings beside the account's.
        path: '/',
        component: OrganizationsProvider,
        preload: preloadOrganizations,
        children: [
          {
            // Every screen behind the session shares one frame, drawn once (ADR 0037, ADR 0039): the start,
            // onboarding and an invitation as well, which are drawn in it for someone who has an
            // organization and as entry screens, with the frame aside, for someone who has none.
            path: '/',
            component: AppFrame,
            children: [
              { path: '/', component: OrganizationRedirect },
              { path: '/onboarding', component: OnboardingPage, preload: preloadUserInvitations },
              // The invitation email's link (ADR 0033, D5); a visitor signs in or signs up and comes back.
              { path: '/invitations/:id', component: InvitationPage, preload: preloadInvitation },
              {
                path: '/settings',
                children: [
                  { path: '/', component: () => <Navigate href="/settings/profile" /> },
                  { path: '/profile', component: ProfilePage, preload: preloadAccountDeletion },
                  // The link of the deletion email (ADR 0049); a visitor signs in and comes back.
                  { path: '/delete-account', component: DeleteAccountPage, preload: preloadAccountDeletion },
                  { path: '/security', component: SecurityPage, preload: preloadSecurity },
                  { path: '/preferences', component: PreferencesPage }
                ]
              },
              {
                path: tenantPath,
                component: RequireOrganization,
                children: [
                  { path: '/', component: HomePage },
                  { path: '/customers', component: CustomersPage, preload: preloadCustomers },
                  {
                    path: '/settings',
                    children: [
                      { path: '/', component: SettingsOfOrganization },
                      { path: '/general', component: OrganizationGeneralPage },
                      { path: '/members', component: OrganizationMembersPage, preload: preloadTeam },
                      { path: '/roles', component: OrganizationRolesPage, preload: preloadTeam },
                      { path: '/activity', component: OrganizationActivityPage, preload: preloadActivity }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  { path: publicPath, component: PublicOrganizationPage, preload: preloadPublic },
  { path: '/account', component: AccountRedirect },
  ...entryScreens,
  { path: '*404', component: NotFoundPage }
]
