import { For, Show } from 'solid-js'
import { createLate } from '#motion'

export type SettingsSkeletonProps = {
  /** Said to screen readers while it waits ("Loading…"). */
  label: string
  /** How many rows to draw: about as many as usually come. */
  rows?: number | undefined
}

/**
 * The place of a `SettingsSection` while its rows load: a heading bar and rows of the same height, so
 * nothing below jumps when they arrive. It appears only after a moment, so a quick load does not flash, and
 * on time when it takes over from another placeholder of the same wait (`createLate`).
 */
export function SettingsSkeleton(props: SettingsSkeletonProps) {
  const late = createLate()

  return (
    <Show when={late()}>
      <div aria-busy="true" class="@container flex flex-col gap-3">
        <p role="status" class="sr-only">
          {props.label}
        </p>
        <div aria-hidden="true" class="flex flex-col gap-1.5">
          <div class="h-5 w-40 rounded-md bg-secondary" />
          <div class="h-4 w-64 max-w-full rounded-md bg-secondary" />
        </div>
        <div
          aria-hidden="true"
          class="divide-y divide-border-subtle rounded-md border border-border-subtle bg-background"
        >
          <For each={Array.from({ length: props.rows ?? 3 })}>
            {() => (
              <div class="flex items-center gap-3 p-4 @md:px-5">
                <div class="size-9 shrink-0 rounded-md bg-secondary" />
                <div class="flex flex-1 flex-col gap-1.5">
                  <div class="h-4 w-1/3 rounded-md bg-secondary" />
                  <div class="h-3.5 w-1/2 rounded-md bg-secondary" />
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
