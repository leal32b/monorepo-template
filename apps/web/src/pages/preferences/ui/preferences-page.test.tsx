import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, ThemeProvider } from '#shared/config'
import { PreferencesPage } from './preferences-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

function renderPage() {
  render(() => (
    <I18nProvider locale="en">
      <ThemeProvider>
        <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
          <AuthProvider client={createAuthClient({ fetch: async () => Response.json(null) })}>
            <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
              <MemoryRouter>
                <Route path="/" component={PreferencesPage} />
              </MemoryRouter>
            </SessionProvider>
          </AuthProvider>
        </ApiProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
}

const section = (name: string) => screen.getByRole('region', { name })

describe('PreferencesPage', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('offers the theme, following the system until one is chosen', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Preferences' })).toBeInTheDocument()
    const theme = within(section('Appearance')).getByRole('radiogroup', { name: 'Theme' })
    expect(within(theme).getByRole('radio', { name: 'System' })).toBeChecked()
  })

  it('applies the chosen theme at once', () => {
    renderPage()

    fireEvent.click(within(section('Appearance')).getByRole('radio', { name: 'Dark' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('offers each language by its own name, and switches the screens to the chosen one', async () => {
    renderPage()
    const language = within(section('Language')).getByRole('combobox', { name: 'Language of the screens' })
    expect(language).toHaveValue('en')
    expect(
      within(language)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['English', 'Español', 'Português (Brasil)'])

    fireEvent.change(language, { target: { value: 'es' } })

    expect(await screen.findByRole('heading', { level: 1, name: 'Preferencias' })).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('locale')).toBe('es'))
  })

  it('says the language is for this device, and that emails keep theirs', () => {
    renderPage()

    expect(section('Language')).toHaveTextContent('Emails keep the language you signed up in.')
  })
})
