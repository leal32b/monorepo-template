import { useMatch } from '@solidjs/router'

/**
 * Whether the screen is one of the settings: the account's, at `/settings/...`, or the organization's,
 * at `/:orgSlug/settings/...` (ADR 0034). Both share one side menu.
 */
export function useInSettings(): () => boolean {
  const account = useMatch(() => '/settings/*')
  const organization = useMatch(() => '/:orgSlug/settings/*')
  return () => account() !== undefined || organization() !== undefined
}
