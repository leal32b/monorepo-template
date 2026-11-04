import { Navigate, type RouteDefinition, useParams } from '@solidjs/router'
import { lazy } from 'solid-js'
import { ForgotPasswordPage } from '#pages/forgot-password'
import { NotFoundPage } from '#pages/not-found'
import { ResetPasswordPage } from '#pages/reset-password'
import { SignInPage } from '#pages/sign-in'
import { SignUpPage } from '#pages/sign-up'
import { TwoFactorPage } from '#pages/two-factor'
import { AccountRedirect } from './account-redirect'

/**
 * What a visitor needs (the entry screens) is in the first download; what only someone signed in
 * needs (the session guard with the side menu, the menus, the palette and the screens behind it) loads
 * when they get there, so opening the sign-in does not pay for Kobalte's dialogs and menus. The router
 * keeps the page on screen until the next one is ready: no blank flash. The security screen is the
 * heaviest of those (QR code, backup codes, every security form), so it loads on its own.
 */
const RequireSession = lazy(() => import('./require-session').then((m) => ({ default: m.RequireSession })))
const OrganizationsProvider = lazy(() =>
  import('#entities/organizations').then((m) => ({ default: m.OrganizationsProvider }))
)
const OrganizationRedirect = lazy(() =>
  import('./organization-redirect').then((m) => ({ default: m.OrganizationRedirect }))
)
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
const OnboardingPage = lazy(() => import('#pages/onboarding').then((m) => ({ default: m.OnboardingPage })))
const ProfilePage = lazy(() => import('#pages/profile').then((m) => ({ default: m.ProfilePage })))
const PreferencesPage = lazy(() => import('#pages/preferences').then((m) => ({ default: m.PreferencesPage })))
const SecurityPage = lazy(() => import('#pages/security').then((m) => ({ default: m.SecurityPage })))

/** `/:orgSlug/settings` opens on General, as `/settings` opens on the profile. */
function SettingsOfOrganization() {
  const params = useParams<{ orgSlug: string }>()
  return <Navigate href={`/${params.orgSlug}/settings/general`} />
}

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
    children: [
      {
        // The organizations are read for every screen behind the session, the account settings
        // included: their side menu offers the organization's settings beside the account's.
        path: '/',
        component: OrganizationsProvider,
        children: [
          {
            path: '/settings',
            children: [
              { path: '/', component: () => <Navigate href="/settings/profile" /> },
              { path: '/profile', component: ProfilePage },
              { path: '/security', component: SecurityPage },
              { path: '/preferences', component: PreferencesPage }
            ]
          },
          { path: '/', component: OrganizationRedirect },
          { path: '/onboarding', component: OnboardingPage },
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
                  { path: '/members', component: OrganizationMembersPage },
                  { path: '/roles', component: OrganizationRolesPage }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  { path: '/account', component: AccountRedirect },
  { path: '/signup', component: SignUpPage },
  { path: '/login', component: SignInPage },
  { path: '/login/two-factor', component: TwoFactorPage },
  { path: '/forgot-password', component: ForgotPasswordPage },
  { path: '/reset-password', component: ResetPasswordPage },
  { path: '*404', component: NotFoundPage }
]
