import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'
import { coreGroups, lazyGroups } from './messages'

/**
 * Every slice keeps its texts in `dictionaries/<group>/<language>.ts` (ADR 0058). The core groups, which
 * the first download carries, are merged by `locales/<language>.ts`; every other group is fetched with the
 * screens that use it (ADR 0071). These tests hold the lists and the merge to the files, so a group that is
 * added and neither merged nor listed, or a key written in two groups, fails here instead of showing English,
 * or the wrong text, to a user.
 */
const files = import.meta.glob<Record<string, Record<string, unknown>>>('./dictionaries/*/*.ts', { eager: true })

const merged = { en, es, 'pt-BR': ptBR }
const languages = Object.keys(merged) as (keyof typeof merged)[]

/** group -> language -> top-level keys and texts. */
const groups = new Map<string, Map<string, Record<string, unknown>>>()
for (const [path, module] of Object.entries(files)) {
  const [, group, file] = path.match(/dictionaries\/([^/]+)\/([^/]+)\.ts$/) ?? []
  if (!group || !file) continue
  const texts = Object.values(module)[0] ?? {}
  groups.set(group, (groups.get(group) ?? new Map()).set(file, texts))
}

describe('dictionaries', () => {
  it('lists every group, core or fetched later, and no other', () => {
    expect([...groups.keys()].sort()).toEqual([...coreGroups, ...lazyGroups].sort())
    expect(new Set([...coreGroups, ...lazyGroups]).size).toBe(coreGroups.length + lazyGroups.length)
  })

  it('has a group for the customers texts', () => {
    expect(lazyGroups).toContain('customers')
  })

  it.each([...groups])('%s has one file per language, with the same keys in each', (_group, byLanguage) => {
    expect([...byLanguage.keys()].sort()).toEqual([...languages].sort())
    const english = Object.keys(byLanguage.get('en') ?? {}).sort()
    for (const texts of byLanguage.values()) {
      expect(Object.keys(texts).sort()).toEqual(english)
    }
  })

  it('writes no key in two groups', () => {
    const keys = [...groups.values()].flatMap((byLanguage) => Object.keys(byLanguage.get('en') ?? {}))
    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([])
  })

  it.each(languages)('merges every core group into %s unchanged', (language) => {
    for (const group of coreGroups) {
      for (const [key, texts] of Object.entries(groups.get(group)?.get(language) ?? {})) {
        expect(merged[language][key as keyof (typeof merged)[typeof language]], key).toBe(texts)
      }
    }
  })

  it.each(languages)(
    'keeps no text of its own in the %s locale file, only the merge of the core groups',
    (language) => {
      const owned = new Set(coreGroups.flatMap((group) => Object.keys(groups.get(group)?.get(language) ?? {})))
      expect(Object.keys(merged[language]).filter((key) => !owned.has(key))).toEqual([])
    }
  )
})
