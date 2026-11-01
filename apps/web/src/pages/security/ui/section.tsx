import type { ParentProps } from 'solid-js'

/** One part of the account page, named by its heading. */
export function Section(props: ParentProps<{ id: string; title: string }>) {
  return (
    <section aria-labelledby={props.id} class="flex flex-col gap-3">
      <h2 id={props.id} class="text-lg font-semibold tracking-tight">
        {props.title}
      </h2>
      {props.children}
    </section>
  )
}
