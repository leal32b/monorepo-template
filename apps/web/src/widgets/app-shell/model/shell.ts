import { type Accessor, createContext, createSignal, useContext } from 'solid-js'
import type { Organization } from '#entities/organizations'
import type { AuthFailure } from '#shared/api'

/** What a screen tells the frame around it: its title, and the organization it is about. */
export type ShellScreen = {
  title: Accessor<string>
  /** Kept by the screen as a plain value, so the frame can still read it after the screen has left. */
  organization: Accessor<Organization | undefined>
}

export type Shell = {
  /** The screen on view, the last one to come in; none while the frame holds a page of its own kind. */
  screen: Accessor<ShellScreen | undefined>
  /** A screen comes in; the function it gets back takes it out. */
  enter: (screen: ShellScreen) => () => void
  /** Why signing out failed, said on the screen below its title. */
  signOutFailure: Accessor<AuthFailure | undefined>
}

export const ShellContext = createContext<Shell>()

/**
 * The frame's side of the screens below it (ADR 0037). Screens are kept in the order they came in: on a
 * navigation the next one comes in before the previous one leaves, so the last one is the one on view.
 */
export function createShell(signOutFailure: Accessor<AuthFailure | undefined>): Shell {
  const [screens, setScreens] = createSignal<ShellScreen[]>([])
  return {
    screen: () => screens().at(-1),
    enter: (screen) => {
      setScreens((list) => [...list, screen])
      // A screen leaves while the router's transition commits, and the transition's own value of the
      // list, written as the next screen came in, would overwrite a removal made then: it waits a tick.
      return () => queueMicrotask(() => setScreens((list) => list.filter((candidate) => candidate !== screen)))
    },
    signOutFailure
  }
}

/** The frame around a screen, if any. */
export const useShell = (): Shell | undefined => useContext(ShellContext)

/** The organization of the screen on view, for the frame's parts; outside any (the account settings) none. */
export function useShellOrganization(): Accessor<Organization | undefined> {
  const shell = useShell()
  return () => shell?.screen()?.organization()
}
