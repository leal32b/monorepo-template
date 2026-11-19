import { createSignal } from 'solid-js'
import type { en, Messages } from './locales/en'

/**
 * Every supported language, each in a file of its own that is fetched only for the user who reads
 * it. Adding one is a new file in `locales/` plus a line here.
 */
const loaders = {
  en: () => import('./locales/en').then((module) => module.en),
  es: () => import('./locales/es').then((module) => module.es),
  'pt-BR': () => import('./locales/pt-BR').then((module) => module.ptBR)
} satisfies Record<string, () => Promise<typeof en>>

export type Locale = keyof typeof loaders

export const locales = Object.keys(loaders) as Locale[]

/** Each language by its own name, the way someone who reads it looks for it. */
export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (Brasil)'
}

/**
 * The groups of `dictionaries/` that the language's own file merges: what a visitor's screens and the frame
 * need, so the first download carries them (ADR 0071).
 */
export const coreGroups = ['shell', 'entry'] as const

/**
 * The groups fetched with the screens that use them, by `loadGroups` (ADR 0071). A new group is a folder in
 * `dictionaries/`, a name here and a line in the `Messages` type of `locales/en.ts`.
 */
export const lazyGroups = ['account', 'audit', 'billing', 'customers', 'organizations', 'public', 'team'] as const

export type Group = (typeof lazyGroups)[number]

/** Each lazy group's files, fetched one at a time; a file's one export is the group's texts. */
const files = import.meta.glob<Record<string, object>>(['./dictionaries/*/*.ts', '!./dictionaries/{shell,entry}/*.ts'])

type Loaded = { core: typeof en; groups: Partial<Record<Group, object>> }

const loaded: Partial<Record<Locale, Loaded>> = {}
/** The groups some screen asked for, which a language loaded later fetches too. */
const requested = new Set<Group>()
const fetching = new Map<string, Promise<void>>()
/** Counts arrivals, so what reads the texts (`getMessages`, `hasGroups`) is read again when more come. */
const [arrivals, arrived] = createSignal(0)

/** One group's texts in one language, fetched once. A fetch that fails is not kept, so asking again retries. */
function fetchGroup(locale: Locale, group: Group): Promise<void> {
  const language = loaded[locale]
  if (language === undefined || language.groups[group] !== undefined) return Promise.resolve()
  const key = `${locale}/${group}`
  const pending =
    fetching.get(key) ??
    (async () => {
      const [texts] = Object.values<object>(
        await (files[`./dictionaries/${group}/${locale}.ts`] as () => Promise<Record<string, object>>)()
      )
      language.groups[group] = texts as object
      arrived((count) => count + 1)
    })().finally(() => fetching.delete(key))
  fetching.set(key, pending)
  return pending
}

/**
 * Fetches a language, once: its own file and the groups asked for so far, so a language chosen while a
 * screen is open has that screen's texts too. The app waits for it before it shows any text.
 */
export async function loadMessages(locale: Locale): Promise<void> {
  if (loaded[locale] === undefined) {
    const core = await loaders[locale]()
    loaded[locale] ??= { core, groups: {} }
    arrived((count) => count + 1)
  }
  // A group asked for after this line finds the language loaded, and is fetched by `loadGroups`.
  await Promise.all([...requested].map((group) => fetchGroup(locale, group)))
}

/**
 * Asks for groups, for every language that is loaded, and waits for them. A screen that needs a group waits
 * for this before it draws, so it never shows text that is not there (ADR 0071). A failure is thrown, to the
 * screen's `ReadFailure`.
 */
export async function loadGroups(groups: readonly Group[]): Promise<void> {
  for (const group of groups) requested.add(group)
  await Promise.all(locales.flatMap((locale) => groups.map((group) => fetchGroup(locale, group))))
}

/** Whether the groups are there in every language that is loaded; reactive. */
export function hasGroups(groups: readonly Group[]): boolean {
  arrivals()
  return Object.values(loaded).every((language) => groups.every((group) => language.groups[group] !== undefined))
}

/** The texts a language has so far: its own file and the groups that arrived; reactive. */
export function getMessages(locale: Locale): Messages {
  arrivals()
  const language = loaded[locale]
  if (!language) throw new Error(`The messages for ${locale} are not loaded`)
  return Object.assign({}, language.core, ...Object.values(language.groups)) as Messages
}
