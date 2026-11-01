import { Dialog } from '@kobalte/core/dialog'
import { createEffect, createMemo, createSignal, createUniqueId, For, Show } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type CommandItem = {
  id: string
  /** What the item does, as the user reads it. */
  label: string
  /** The heading it sits under; items with the same group are shown together, in the order met. */
  group: string
  icon?: IconName | undefined
  /** Other words that find it, such as a synonym. */
  keywords?: string | undefined
}

export type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the palette and its search field for screen readers, such as "Command palette". */
  title: string
  placeholder: string
  /** Said when nothing matches what was typed. */
  emptyLabel: string
  items: CommandItem[]
  /** Called with the chosen item's id; the palette closes first. */
  onSelect: (id: string) => void
}

/** Letters without accents or case, so "sesion" finds "Sesión". */
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * A search box over a list of screens and actions, for the keyboard first: type to filter, the
 * arrows move, Enter chooses, Escape closes. It is a modal dialog around a combobox; focus is in the
 * search field and the highlighted item is announced through `aria-activedescendant`. The app decides
 * what the list holds, when to open it (a shortcut, a button) and what each item does.
 */
export function CommandPalette(props: CommandPaletteProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-foreground/40" />
        <Dialog.Content class="fixed top-[10vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-md border border-border-subtle bg-background outline-none">
          <Dialog.Title class="sr-only">{props.title}</Dialog.Title>
          <Search {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

/** The search and its list. It lives inside the dialog, so each opening starts with an empty search. */
function Search(props: CommandPaletteProps) {
  const id = createUniqueId()
  const [query, setQuery] = createSignal('')
  const [active, setActive] = createSignal(0)

  const found = createMemo(() => {
    const terms = plain(query()).split(/\s+/).filter(Boolean)
    return props.items.filter((item) => {
      const text = plain(`${item.label} ${item.keywords ?? ''}`)
      return terms.every((term) => text.includes(term))
    })
  })
  const groups = createMemo(() => [...new Set(found().map((item) => item.group))])
  /** The list in the order it is shown, which is the order the arrows walk. */
  const shown = createMemo(() => groups().flatMap((group) => found().filter((item) => item.group === group)))

  const optionId = (item: CommandItem) => `${id}-${item.id}`
  const current = () => shown()[active()]

  const choose = (item: CommandItem | undefined) => {
    if (!item) return
    props.onOpenChange(false)
    props.onSelect(item.id)
  }

  const move = (to: number) => {
    const last = shown().length - 1
    setActive(to < 0 ? last : to > last ? 0 : to)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(active() + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(active() - 1)
        break
      case 'Home':
        event.preventDefault()
        move(0)
        break
      case 'End':
        event.preventDefault()
        move(shown().length - 1)
        break
      case 'Enter':
        event.preventDefault()
        choose(current())
        break
    }
  }

  // Keeps the highlighted item in view when the list scrolls.
  createEffect(() => {
    const item = current()
    if (item) document.getElementById(optionId(item))?.scrollIntoView?.({ block: 'nearest' })
  })

  return (
    <>
      <div class="flex items-center gap-2 border-b border-border-subtle px-3">
        <Icon name="search" class="text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-label={props.title}
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={current() ? optionId(current() as CommandItem) : undefined}
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck={false}
          placeholder={props.placeholder}
          value={query()}
          onInput={(event) => {
            setQuery(event.currentTarget.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          class="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
      </div>
      <Show
        when={shown().length > 0}
        fallback={
          <p role="status" class="p-4 text-center text-sm text-muted-foreground">
            {props.emptyLabel}
          </p>
        }
      >
        <div id={`${id}-list`} role="listbox" aria-label={props.title} class="overflow-y-auto p-1.5">
          <For each={groups()}>
            {(group) => (
              // biome-ignore lint/a11y/useSemanticElements: inside a listbox a group is not a fieldset
              <div role="group" aria-label={group}>
                <div aria-hidden="true" class="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  {group}
                </div>
                <For each={found().filter((item) => item.group === group)}>
                  {(item) => (
                    // The keyboard works from the search field (`aria-activedescendant`); the options are for the pointer.
                    // biome-ignore lint/a11y/useKeyWithClickEvents: options are chosen from the combobox's own keys
                    <div
                      id={optionId(item)}
                      role="option"
                      tabIndex={-1}
                      aria-selected={current() === item}
                      onPointerMove={() => setActive(shown().indexOf(item))}
                      onClick={() => choose(item)}
                      class={cn(
                        'flex h-11 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-base sm:h-9 sm:text-sm',
                        current() === item && 'bg-secondary'
                      )}
                    >
                      <Show when={item.icon}>{(name) => <Icon name={name()} class="text-muted-foreground" />}</Show>
                      {item.label}
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  )
}
