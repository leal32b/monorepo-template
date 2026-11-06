import {
  type ComponentProps,
  children,
  createContext,
  createUniqueId,
  type JSX,
  Show,
  splitProps,
  useContext
} from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type SettingsRowProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** A decorative icon before the title. */
  icon?: IconName | undefined
  /** An `Avatar` in the icon's place, for a row about a person or an organization. */
  avatar?: JSX.Element
  /** A decorative letter in the icon's place, for a mark the icon set lacks, such as "G" for Google. */
  letter?: string | undefined
  /** What the row is about. */
  title: string
  /** The row's state, such as a `Badge`, beside the title. */
  badge?: JSX.Element
  /** What the row does or what it is now, in one line. */
  description?: string | undefined
  /** Why something cannot be done here, in a line under the description ("Make someone else an owner first"). */
  note?: string | undefined
  /**
   * What just happened, such as "Your password was changed": announced politely, in the row where the
   * user acted. The area is always there, so a change to it is read out.
   */
  status?: string | undefined
  /** The row's actions, such as `Button`s: on the right, and full width where the row is narrow. */
  action?: JSX.Element
  /**
   * The form an action opens, inline below the row, such as a `SettingsPanel`. The area shows only
   * while there is something in it, so a `<Show>` that is off draws nothing. One panel at a time:
   * `createPanels`.
   */
  panel?: JSX.Element
}

/** Whether resolved children hold anything to draw: a `<Show>` that is off resolves to nothing. */
const drawn = (resolved: unknown[]) => resolved.some((item) => item !== undefined && item !== null && item !== false)

/**
 * One setting: icon, title with its state, a line of description, and the action on the right. Where
 * the row is narrow (a phone, or a narrow column such as onboarding's) the action drops below and takes
 * the full width: the row follows its own width, not the screen's, and a word too long for it breaks.
 * What the action opens appears under the row in the `panel`, never on another page. Put it inside a
 * `SettingsSection`.
 */
/** The id of the row's note, while it has one: a button that cannot act points to it for its reason. */
const NoteContext = createContext<() => string | undefined>(() => undefined)

/** The id of the `note` of the row around, if it has one (`PanelButton` uses it when disabled). */
export const useRowNote = () => useContext(NoteContext)

export function SettingsRow(props: SettingsRowProps) {
  const noteId = createUniqueId()

  return (
    <NoteContext.Provider value={() => (props.note ? noteId : undefined)}>
      <Row {...props} noteId={noteId} />
    </NoteContext.Provider>
  )
}

/** The row itself, inside its note's context, so the actions it draws can read it. */
function Row(props: SettingsRowProps & { noteId: string }) {
  const [local, rest] = splitProps(props, [
    'class',
    'icon',
    'avatar',
    'letter',
    'title',
    'badge',
    'description',
    'note',
    'status',
    'action',
    'panel',
    'noteId'
  ])
  const action = children(() => local.action)
  const panel = children(() => local.panel)

  return (
    <div class={cn('@container', local.class)} {...rest}>
      <div class="flex flex-col gap-3 p-4 @md:flex-row @md:items-center @md:gap-4 @md:px-5">
        <div class="flex min-w-0 flex-1 items-start gap-3">
          <Show when={local.avatar}>{local.avatar}</Show>
          <Show when={!local.avatar && (local.icon || local.letter)}>
            <span
              aria-hidden="true"
              class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted-foreground"
            >
              <Show when={local.icon} fallback={<span class="font-bold text-foreground">{local.letter}</span>}>
                {(name) => <Icon name={name()} />}
              </Show>
            </span>
          </Show>
          {/* A word too long for the row, such as an email, breaks: `anywhere` counts in a flex item's width too. */}
          <div class="min-w-0 flex-1 break-anywhere">
            <div class="flex flex-wrap items-center gap-2 font-medium">
              {local.title}
              {local.badge}
            </div>
            <Show when={local.description}>
              <p class="mt-0.5 text-sm text-muted-foreground">{local.description}</p>
            </Show>
            <Show when={local.note}>
              <p id={local.noteId} class="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <Icon name="info" class="mt-0.5 size-4 shrink-0" />
                {local.note}
              </p>
            </Show>
            <p role="status" class="flex items-start gap-1.5 text-sm text-success not-empty:mt-1.5">
              <Show when={local.status}>
                <Icon name="success" class="mt-0.5 size-4" />
                {local.status}
              </Show>
            </p>
          </div>
        </div>
        <Show when={drawn(action.toArray())}>
          <div class="flex shrink-0 gap-2 *:flex-1 @md:*:flex-none">{action()}</div>
        </Show>
      </div>
      <Show when={drawn(panel.toArray())}>
        <div class="flex flex-col gap-4 border-t border-border-subtle bg-surface p-4 @md:p-5">{panel()}</div>
      </Show>
    </div>
  )
}
