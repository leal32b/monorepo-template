import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

/**
 * Every slice keeps its texts in `dictionaries/<group>/<language>.ts` (ADR 0058); `locales/<language>.ts`
 * only merges them. These tests hold the merge to the files, so a group that is added and not merged, or a
 * key written in two groups, fails here instead of showing English, or the wrong text, to a user.
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
  it('has a group for the customers texts', () => {
    expect([...groups.keys()]).toContain('customers')
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

  it.each(languages)('merges every group into %s unchanged', (language) => {
    for (const byLanguage of groups.values()) {
      for (const [key, texts] of Object.entries(byLanguage.get(language) ?? {})) {
        expect(merged[language][key as keyof (typeof merged)[typeof language]], key).toBe(texts)
      }
    }
  })

  it.each(languages)('keeps no text of its own in the %s locale file, only the merge', (language) => {
    const owned = new Set([...groups.values()].flatMap((byLanguage) => Object.keys(byLanguage.get(language) ?? {})))
    expect(Object.keys(merged[language]).filter((key) => !owned.has(key))).toEqual([])
  })
})
