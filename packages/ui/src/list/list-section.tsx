import { type ComponentProps, createEffect, createUniqueId, type JSX, on, Show, splitProps } from 'solid-js'
import { cn } from '#libs'

export type ListSectionProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** What the section is about: its heading. */
  title: string
  /** One line under the heading, saying what the rows do together. */
  description?: string | undefined
  /**
   * What just happened to the section as a whole, such as a row that left it ("Grace was removed"):
   * said below the rows and given focus, so the keyboard does not fall to the page when the row it was
   * on goes away.
   */
  status?: string | undefined
  /** The section's `ListRow`s. */
  children: JSX.Element
}

/**
 * A list of things you act on, such as a page of settings or a register's records, is sections. A section is a heading, one line, and a bordered group of rows
 * divided by a subtle line. It is a named region, so a screen reader can jump between sections.
 */
export function ListSection(props: ListSectionProps) {
  const [local, rest] = splitProps(props, ['class', 'title', 'description', 'status', 'children'])
  const headingId = createUniqueId()
  let status: HTMLParagraphElement | undefined
  createEffect(
    on(
      () => local.status,
      (text) => text && status?.focus(),
      { defer: true }
    )
  )

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
      <p
        ref={(line) => {
          status = line
        }}
        tabIndex={-1}
        role="status"
        class="-mt-3 text-sm text-muted-foreground outline-none not-empty:mt-0"
      >
        {local.status}
      </p>
    </section>
  )
}
