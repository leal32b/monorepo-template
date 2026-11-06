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
const InvitationPage = lazy(() => import('#pages/invitation').then((m) => ({ default: m.InvitationPage })))
const OnboardingPage = lazy(() => import('#pages/onboarding').then((m) => ({ default: m.OnboardingPage })))
const ProfilePage = lazy(() => import('#pages/profile').then((m) => ({ default: m.ProfilePage })))
const PreferencesPage = lazy(() => import('#pages/preferences').then((m) => ({ default: m.PreferencesPage })))
const SecurityPage = lazy(() => import('#pages/security').then((m) => ({ default: m.SecurityPage })))

/**
 * A screen's reads start in its route, as soon as the router opens it (ADR 0038): the session and the
 * organizations together at boot, a screen's own reads beside them. The entities' code loads on demand, as
 * the screens' does, so a read starts once its code is in; a read that fails is said by the screen that
 * reads it.
 */
const preload = <Entity,>(
  entity: () => Promise<Entity>,
  start: (loaded: Entity, clients: { auth: AuthClient; api: ApiClient }) => unknown
) => {
  const clients = { auth: useAuth(), api: useApi() }
  entity()
    .then((loaded) => start(loaded, clients))
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
const preloadSession = onOpen(() => preload(sessions, (entity, { auth }) => entity.sessionQuery(auth)()))
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
const identityOptions = () => import('#entities/identity-options')
/** The security screen reads the ways to sign in, and whether the API has Google for the Google row. */
const preloadSecurity = onOpen(() => {
  preload(accounts, (entity, { auth }) => entity.signInMethodsQuery(auth)())
  preload(identityOptions, (entity, { api }) => entity.identityOptionsQuery(api)())
})
const preloadUserInvitations = onOpen(() =>
  preload(organizations, (entity, { auth }) => entity.userInvitationsQuery(auth)())
)
/** The invitation of a link, read as it opens, its id taken now as `preloadTeam` takes its slug. */
const preloadInvitation = onOpen(({ params }) => {
  const id = params.id as string
  preload(organizations, (entity, { api }) => entity.invitationQuery(api)(id))
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
 * Every screen of the app. Tenant screens sit under `/:orgSlug`; entry, account, onboarding and
 * invitation screens stay outside it, and the words they use are reserved, so no slug can shadow
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
                  { path: '/profile', component: ProfilePage },
                  { path: '/security', component: SecurityPage, preload: preloadSecurity },
                  { path: '/preferences', component: PreferencesPage }
                ]
              },
              {
                path: tenantPath,
                component: RequireOrganization,
                children: [
                  { path: '/', component: HomePage },
                  {
                    path: '/settings',
                    children: [
                      { path: '/', component: SettingsOfOrganization },
                      { path: '/general', component: OrganizationGeneralPage },
                      { path: '/members', component: OrganizationMembersPage, preload: preloadTeam },
                      { path: '/roles', component: OrganizationRolesPage, preload: preloadTeam }
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
  { path: '/account', component: AccountRedirect },
  ...entryScreens,
  { path: '*404', component: NotFoundPage }
]
