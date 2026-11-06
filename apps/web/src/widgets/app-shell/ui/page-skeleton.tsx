import { createLate, SettingsSkeleton } from '@repo/ui'
import { createMemo, onCleanup, Show } from 'solid-js'
import type { Organization } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { useShell } from '../model/shell'
import { screenClass } from './screen-class'

/**
 * The place of a screen that cannot be drawn yet, because what it needs to know is still being read, such
 * as what the caller may do in an organization: its title and content as skeletons, after the wait's delay,
 * inside the frame, which stays and shows the organization in its side menu (ADR 0038).
 */
export function PageSkeleton(props: { organization?: Organization | undefined }) {
  const { t } = useI18n()
  const late = createLate()
  const shell = useShell()
  if (shell !== undefined) {
    const organization = createMemo(() => props.organization)
    onCleanup(shell.enter({ title: () => '', organization }))
  }

  return (
    <main class={screenClass}>
      <Show when={late()}>
        <div aria-hidden="true" class="h-8 w-48 max-w-full rounded-md bg-secondary" />
      </Show>
      <SettingsSkeleton label={t('appShell.loading')} />
    </main>
  )
}
