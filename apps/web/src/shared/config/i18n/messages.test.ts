import { flatten } from '@solid-primitives/i18n'
import { en, type Messages } from './locales/en'
import { getMessages, loadMessages, locales } from './messages'

/** Dotted key -> text, for the text leaves only (the library also keeps the parent nodes). */
const leaves = (dictionary: Messages): Record<string, string> =>
  Object.fromEntries(
    Object.entries(flatten(dictionary)).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )

const placeholders = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort()

await Promise.all(locales.map(loadMessages))

describe.each(locales)('messages in %s', (locale) => {
  const english = leaves(en)
  const texts = leaves(getMessages(locale))

  it('has the same keys as English', () => {
    expect(Object.keys(texts).sort()).toEqual(Object.keys(english).sort())
  })

  it('has no empty text', () => {
    for (const text of Object.values(texts)) {
      expect(text.trim()).not.toBe('')
    }
  })

  it('uses the same placeholders as English', () => {
    for (const [key, text] of Object.entries(english)) {
      expect(placeholders(texts[key] ?? ''), key).toEqual(placeholders(text))
    }
  })
})

describe('loading', () => {
  beforeEach(() => vi.resetModules())

  it('refuses a language that was not loaded, so a screen never shows empty text', async () => {
    const { getMessages } = await import('./messages')

    expect(() => getMessages('es')).toThrow('The messages for es are not loaded')
  })

  it('loads a language once, and then has it', async () => {
    const { getMessages, loadMessages } = await import('./messages')

    await loadMessages('es')
    const first = getMessages('es')
    await loadMessages('es')

    expect(getMessages('es')).toBe(first)
    expect(first.signIn.title).toBe('Iniciar sesión')
  })
})
