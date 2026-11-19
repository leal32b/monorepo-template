import { render, screen, waitFor } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from './context'

const Probe = () => {
  const { t } = useI18n()
  return <p>{t('mail.open', { provider: 'Gmail' })}</p>
}

describe('I18nProvider', () => {
  it('translates with the locale it is given, filling the placeholders', () => {
    render(() => (
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    ))

    expect(screen.getByText('Open Gmail')).toBeInTheDocument()
  })

  it('translates to Brazilian Portuguese', () => {
    render(() => (
      <I18nProvider locale="pt-BR">
        <Probe />
      </I18nProvider>
    ))

    expect(screen.getByText('Abrir o Gmail')).toBeInTheDocument()
  })

  it('switches the text when the locale changes', async () => {
    const Switcher = () => {
      const { setLocale } = useI18n()
      return (
        <button type="button" onClick={() => setLocale('pt-BR')}>
          switch
        </button>
      )
    }
    render(() => (
      <I18nProvider locale="en">
        <Probe />
        <Switcher />
      </I18nProvider>
    ))

    screen.getByRole('button').click()

    expect(await screen.findByText('Abrir o Gmail')).toBeInTheDocument()
  })

  it('keeps a changed language on the device', async () => {
    const Switcher = () => {
      const { setLocale } = useI18n()
      return (
        <button type="button" onClick={() => setLocale('es')}>
          switch
        </button>
      )
    }
    render(() => (
      <I18nProvider locale="en">
        <Switcher />
      </I18nProvider>
    ))

    screen.getByRole('button').click()

    await waitFor(() => expect(localStorage.getItem('locale')).toBe('es'))
    localStorage.clear()
  })

  it('fails loudly outside a provider', () => {
    const Orphan = () => {
      useI18n()
      return null
    }

    expect(() => render(() => <Orphan />)).toThrow('useI18n must be used inside an I18nProvider')
  })

  it('sets the document language and keeps it in sync', async () => {
    const Switcher = () => {
      const { setLocale } = useI18n()
      return (
        <button type="button" onClick={() => setLocale('pt-BR')}>
          switch
        </button>
      )
    }
    render(() => (
      <I18nProvider locale="en">
        <Switcher />
      </I18nProvider>
    ))
    expect(document.documentElement.lang).toBe('en')

    screen.getByRole('button').click()

    await waitFor(() => expect(document.documentElement.lang).toBe('pt-BR'))
  })

  describe('groups fetched with their screens (ADR 0071)', () => {
    beforeEach(() => vi.resetModules())
    afterEach(() => vi.restoreAllMocks())

    const fresh = async () => {
      const [{ I18nProvider, useI18n }, messages] = await Promise.all([import('./context'), import('./messages')])
      await messages.loadMessages('en')
      return { I18nProvider, useI18n, ...messages }
    }

    it('draws the texts of a group when it arrives', async () => {
      const { I18nProvider, useI18n, loadGroups } = await fresh()
      const Customers = () => <p>{useI18n().t('customers.title')}</p>
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      render(() => (
        <I18nProvider locale="en">
          <Customers />
        </I18nProvider>
      ))
      expect(screen.getByText('customers.title')).toBeInTheDocument()

      await loadGroups(['customers'])

      expect(await screen.findByText('Customers')).toBeInTheDocument()
    })

    it('says in the console which text is missing, and shows its key', async () => {
      const { I18nProvider, useI18n } = await fresh()
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const Customers = () => <p>{useI18n().t('customers.title')}</p>

      render(() => (
        <I18nProvider locale="en">
          <Customers />
        </I18nProvider>
      ))

      expect(screen.getByText('customers.title')).toBeInTheDocument()
      expect(error).toHaveBeenCalledWith(expect.stringContaining('[i18n] "customers.title"'))
    })

    it('brings the groups already in use along when the language changes', async () => {
      const { I18nProvider, useI18n, loadGroups } = await fresh()
      await loadGroups(['customers'])
      const Customers = () => {
        const { t, setLocale } = useI18n()
        return (
          <button type="button" onClick={() => setLocale('es')}>
            {t('customers.title')}
          </button>
        )
      }
      render(() => (
        <I18nProvider locale="en">
          <Customers />
        </I18nProvider>
      ))

      screen.getByRole('button', { name: 'Customers' }).click()

      expect(await screen.findByRole('button', { name: 'Clientes' })).toBeInTheDocument()
      localStorage.clear()
    })
  })
})
