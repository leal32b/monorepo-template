import type { IconName } from '@repo/ui'

export type SettingsItem<Label extends string> = { href: string; label: Label; icon: IconName }

export type OrganizationSetting = 'general' | 'members' | 'roles' | 'billing' | 'activity'

/** The person's own settings, outside any organization (ADR 0034). */
export const accountSettings: SettingsItem<'profile' | 'security' | 'preferences'>[] = [
  { href: '/settings/profile', label: 'profile', icon: 'profile' },
  { href: '/settings/security', label: 'security', icon: 'security' },
  { href: '/settings/preferences', label: 'preferences', icon: 'monitor' }
]

/**
 * The organization's settings, under its slug (ADR 0034), in the order a manager looks for them (ADR 0080).
 * The plan page is every member's: the plan decides what they can do, and the page says who manages it
 * (ADR 0068).
 */
export const organizationSettings = (home: string): SettingsItem<OrganizationSetting>[] => [
  { href: `${home}/settings/general`, label: 'general', icon: 'organization' },
  { href: `${home}/settings/members`, label: 'members', icon: 'users' },
  { href: `${home}/settings/roles`, label: 'roles', icon: 'role' },
  { href: `${home}/settings/billing`, label: 'billing', icon: 'billing' },
  { href: `${home}/settings/activity`, label: 'activity', icon: 'activity' }
]

/** The settings an operator inside the organization can read (ADR 0077): the others ask Better Auth, which knows no visit. */
export const visitable: ReadonlySet<OrganizationSetting> = new Set(['general', 'activity'])

/**
 * The list a settings screen goes back to on phones, where `/settings` (You) and `/:orgSlug/settings` list
 * their group's settings (ADR 0080); none for a list itself or a screen outside the settings.
 */
export function settingsListOf(pathname: string): { href: string; label: 'you' | 'organizationSettings' } | undefined {
  if (/^\/settings\/[^/]+\/?$/.test(pathname)) return { href: '/settings', label: 'you' }
  const slug = /^\/([^/]+)\/settings\/[^/]+\/?$/.exec(pathname)?.[1]
  return slug === undefined ? undefined : { href: `/${slug}/settings`, label: 'organizationSettings' }
}
