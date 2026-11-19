import { flatten } from '@solid-primitives/i18n'
import type { Messages } from './locales/en'
import { getMessages, lazyGroups, loadGroups, loadMessages, locales } from './messages'

/** Dotted key -> text, for the text leaves only (the library also keeps the parent nodes). */
const leaves = (dictionary: Messages): Record<string, string> =>
  Object.fromEntries(
    Object.entries(flatten(dictionary)).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )

const placeholders = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort()

await Promise.all(locales.map(loadMessages))
await loadGroups(lazyGroups)

describe.each(locales)('messages in %s', (locale) => {
  const english = leaves(getMessages('en'))
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

    expect(getMessages('es')).toEqual(first)
    expect(first.signIn.title).toBe('Iniciar sesión')
  })

  it('has no text of a group until the group is loaded, then keeps it', async () => {
    const { getMessages, hasGroups, loadGroups, loadMessages } = await import('./messages')

    await loadMessages('en')
    expect(hasGroups(['customers'])).toBe(false)
    expect(getMessages('en')).not.toHaveProperty('customers')
    expect(getMessages('en').signIn.title).toBe('Sign in')

    await loadGroups(['customers'])

    expect(hasGroups(['customers'])).toBe(true)
    expect(getMessages('en').customers.title).toBe('Customers')
    expect(hasGroups(['customers', 'billing'])).toBe(false)
    expect(hasGroups([])).toBe(true)
  })

  it('loads the groups already asked for when it loads another language', async () => {
    const { getMessages, loadGroups, loadMessages } = await import('./messages')
    await loadMessages('en')
    await loadGroups(['customers'])

    await loadMessages('es')

    expect(getMessages('es').customers.title).toBe('Clientes')
  })

  it('loads a group for the languages that are loaded, and a group asked for twice once', async () => {
    const { getMessages, loadGroups, loadMessages } = await import('./messages')
    await loadMessages('en')
    await loadMessages('pt-BR')

    await Promise.all([loadGroups(['audit']), loadGroups(['audit'])])

    expect(getMessages('en').activity.title).toBe('Activity')
    expect(getMessages('pt-BR').activity.title).toBe('Atividade')
  })

  it('can ask again for a group whose load failed, since a failure is not kept', async () => {
    vi.doMock('./dictionaries/public/en.ts', () => {
      throw new Error('offline')
    })
    const { hasGroups, loadGroups, loadMessages } = await import('./messages')
    await loadMessages('en')

    await expect(loadGroups(['public'])).rejects.toThrow()
    expect(hasGroups(['public'])).toBe(false)

    vi.doUnmock('./dictionaries/public/en.ts')
    await loadGroups(['public'])
    expect(hasGroups(['public'])).toBe(true)
  })
})
