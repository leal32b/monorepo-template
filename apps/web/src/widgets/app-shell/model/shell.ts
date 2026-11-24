import type { OrganizationLogo, Subscription } from '@repo/contracts'
import { type Accessor, createContext, createEffect, createSignal, useContext } from 'solid-js'
import { type Organization, startingOrganization, useOptionalOrganizations } from '#entities/organizations'
import type { AuthFailure } from '#shared/api'

/** What a screen tells the frame around it: the organization it is about, and what it knows of it. */
export type ShellScreen = {
  /** Kept by the screen as a plain value, so the frame can still read it after the screen has left. */
  organization: Accessor<Organization | undefined>
  /** Its logo, from the membership the screen already has (ADR 0076); none outside an organization. */
  logo?: Accessor<OrganizationLogo | null | undefined>
  /** Its subscription, whose plan the organization's menu names (ADR 0080); none outside an organization. */
  subscription?: Accessor<Subscription | undefined>
  /** Whether the caller's role may invite people, which the organization's menu offers then only. */
  invites?: Accessor<boolean | undefined>
}

/** What a screen of an organization knows of it from the membership, for the organization's menu. */
export type OrganizationDetails = {
  logo: OrganizationLogo | null | undefined
  subscription: Subscription | undefined
  invites: boolean | undefined
}

export type Shell = {
  /** The screen on view, the last one to come in; none while the frame holds a page of its own kind. */
  screen: Accessor<ShellScreen | undefined>
  /** A screen comes in; the function it gets back takes it out. */
  enter: (screen: ShellScreen) => () => void
  /**
   * What the frame last learnt of an organization from one of its screens: its logo and subscription, which
   * its menu keeps drawing on a screen outside it, such as the person's settings, or one still loading.
   */
  detailsOf: (slug: string) => OrganizationDetails | undefined
  /** Signs the person out, from their menu, the palette or the You screen. */
  signOut: () => void
  /** Why signing out failed, said on the screen below its title. */
  signOutFailure: Accessor<AuthFailure | undefined>
}

export const ShellContext = createContext<Shell>()

/**
 * The frame's side of the screens below it (ADR 0037). Screens are kept in the order they came in: on a
 * navigation the next one comes in before the previous one leaves, so the last one is the one on view.
 */
export function createShell(signOut: { signOut: () => void; failure: Accessor<AuthFailure | undefined> }): Shell {
  const [screens, setScreens] = createSignal<ShellScreen[]>([])
  const [details, setDetails] = createSignal<Record<string, OrganizationDetails>>({})
  const screen = () => screens().at(-1)
  createEffect(() => {
    const on = screen()
    const organization = on?.organization()
    const known = { logo: on?.logo?.(), subscription: on?.subscription?.(), invites: on?.invites?.() }
    // A placeholder knows only the organization: what its screens said stays.
    if (organization !== undefined && known.subscription !== undefined)
      setDetails((kept) => ({ ...kept, [organization.slug]: known }))
  })
  return {
    screen,
    detailsOf: (slug) => details()[slug],
    enter: (screen) => {
      setScreens((list) => [...list, screen])
      // A screen leaves while the router's transition commits, and the transition's own value of the
      // list, written as the next screen came in, would overwrite a removal made then: it waits a tick.
      return () => queueMicrotask(() => setScreens((list) => list.filter((candidate) => candidate !== screen)))
    },
    signOut: signOut.signOut,
    signOutFailure: signOut.failure
  }
}

/** The frame around a screen, if any. */
export const useShell = (): Shell | undefined => useContext(ShellContext)

/** The organization of the screen on view, for the frame's parts; outside any (the account settings) none. */
export function useShellOrganization(): Accessor<Organization | undefined> {
  const shell = useShell()
  return () => shell?.screen()?.organization()
}

/**
 * The logo and subscription of an organization the frame draws (ADR 0076, ADR 0080): the screen's own while
 * it is the screen's organization, else what its screens said last.
 */
export function useOrganizationDetails(organization: Organization): Accessor<OrganizationDetails | undefined> {
  // The organization's menu is drawn by the frame, inside its context.
  const shell = useShell() as Shell
  const slug = organization.slug
  return () => {
    const on = shell.screen()
    const subscription = on?.organization()?.slug === slug ? on.subscription?.() : undefined
    return subscription === undefined
      ? shell.detailsOf(slug)
      : { logo: on?.logo?.(), subscription, invites: on?.invites?.() }
  }
}

/**
 * The organization the frame draws at its top and whose screens it offers (ADR 0080): the screen's, or, on a
 * screen outside any (the person's settings, onboarding, an invitation), the one `/` would open, the last one
 * used here else the first, once the list is read. None when the user has none, or the list is not known.
 */
export function useFrameOrganization(): Accessor<Organization | undefined> {
  const current = useShellOrganization()
  const organizations = useOptionalOrganizations()
  return () => {
    const known = organizations?.known()
    return current() ?? (known === undefined ? undefined : startingOrganization(known))
  }
}
