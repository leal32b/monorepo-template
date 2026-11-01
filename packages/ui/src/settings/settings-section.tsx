import { type ComponentProps, createUniqueId, type JSX, Show, splitProps } from 'solid-js'
import { cn } from '#libs'

export type SettingsSectionProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** What the section is about: its heading. */
  title: string
  /** One line under the heading, saying what the rows do together. */
  description?: string | undefined
  /** The section's `SettingsRow`s. */
  children: JSX.Element
}

/**
 * A page of settings is sections. A section is a heading, one line, and a bordered group of rows
 * divided by a subtle line. It is a named region, so a screen reader can jump between sections.
 */
export function SettingsSection(props: SettingsSectionProps) {
  const [local, rest] = splitProps(props, ['class', 'title', 'description', 'children'])
  const headingId = createUniqueId()

  return (
    <section aria-labelledby={headingId} class={cn('flex flex-col gap-3', local.class)} {...rest}>
      <header>
        <h2 id={headingId} class="text-base font-semibold">
          {local.title}
        </h2>
        <Show when={local.description}>
          <p class="text-sm text-muted-foreground">{local.description}</p>
        </Show>
      </header>
      <div class="divide-y divide-border-subtle rounded-md border border-border-subtle bg-background">
        {local.children}
      </div>
    </section>
  )
}
