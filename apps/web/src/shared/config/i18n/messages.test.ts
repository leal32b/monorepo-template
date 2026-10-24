import { flatten } from '@solid-primitives/i18n'
import { en, type Messages } from './locales/en'
import { ptBR } from './locales/pt-BR'

/** Dotted key -> text, for the text leaves only (the library also keeps the parent nodes). */
const leaves = (dictionary: Messages): Record<string, string> =>
  Object.fromEntries(
    Object.entries(flatten(dictionary)).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )

const placeholders = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort()

describe('messages', () => {
  const english = leaves(en)
  const portuguese = leaves(ptBR)

  it('has the same keys in every language', () => {
    expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort())
  })

  it('has no empty text', () => {
    for (const text of [...Object.values(english), ...Object.values(portuguese)]) {
      expect(text.trim()).not.toBe('')
    }
  })

  it('uses the same placeholders in every language', () => {
    for (const [key, text] of Object.entries(english)) {
      expect(placeholders(portuguese[key] ?? ''), key).toEqual(placeholders(text))
    }
  })
})
