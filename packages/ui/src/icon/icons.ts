import { phosphorMarkup } from './phosphor-markup'

/** The weights the template draws its icons in (Phosphor's): `regular` for all, `duotone` for the few that mark a state. */
export type IconWeight = keyof typeof phosphorMarkup

/** The icons drawn from Phosphor, by the name an app asks for (what the icon means, ADR 0027). */
export type PhosphorName = keyof (typeof phosphorMarkup)['regular']

/** The icons that also come in `duotone`: those listed for it in `scripts/generate-icons.mjs`. */
export type DuotoneName = keyof (typeof phosphorMarkup)['duotone']

/**
 * What an app can ask `Icon` for: the Phosphor icons listed in `scripts/generate-icons.mjs` (a new
 * one is a line there, then `pnpm --filter @repo/ui icons`), and the brand marks, which keep colours of
 * their own (ADR 0029).
 */
export type IconName = PhosphorName | 'google'

/** Every name `Icon` takes. */
export const iconNames = [
  ...(Object.keys(phosphorMarkup.regular) as PhosphorName[]),
  'google'
] as const satisfies readonly IconName[]

/** Whether an icon also comes in `duotone`. */
export const hasDuotone = (name: IconName): name is DuotoneName => name in phosphorMarkup.duotone

/** The markup of a Phosphor icon in a weight, or `undefined` for a brand mark. */
export const markupOf = (name: IconName, weight: IconWeight): string | undefined => {
  if (name === 'google') return undefined
  return weight === 'duotone' ? phosphorMarkup.duotone[name as DuotoneName] : phosphorMarkup.regular[name]
}
