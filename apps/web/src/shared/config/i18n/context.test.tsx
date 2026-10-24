import { render, screen } from '@solidjs/testing-library'
import { I18nProvider, useI18n } from './context'

const Probe = () => {
  const { t } = useI18n()
  return <p>{t('apiStatus.up', { service: 'api', timestamp: 'now' })}</p>
}

describe('I18nProvider', () => {
  it('translates with the locale it is given, filling the placeholders', () => {
    render(() => (
      <I18nProvider locale="en">
        <Probe />
      </I18nProvider>
    ))

    expect(screen.getByText('The API is up: api at now')).toBeInTheDocument()
  })

  it('translates to Brazilian Portuguese', () => {
    render(() => (
      <I18nProvider locale="pt-BR">
        <Probe />
      </I18nProvider>
    ))

    expect(screen.getByText('A API está no ar: api às now')).toBeInTheDocument()
  })

  it('switches the text when the locale changes', () => {
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

    expect(screen.getByText('A API está no ar: api às now')).toBeInTheDocument()
  })

  it('fails loudly outside a provider', () => {
    const Orphan = () => {
      useI18n()
      return null
    }

    expect(() => render(() => <Orphan />)).toThrow('useI18n must be used inside an I18nProvider')
  })
})
