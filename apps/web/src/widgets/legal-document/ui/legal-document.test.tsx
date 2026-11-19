import { legal } from '@repo/contracts'
import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider, loadGroups } from '#shared/config'
import { formatDate } from '#shared/lib'
import { LegalDocument } from './legal-document'

const TermsPage = () => <LegalDocument document="terms" />
const PrivacyPage = () => <LegalDocument document="privacy" />

async function renderPage(Page: typeof TermsPage, locale: 'en' | 'pt-BR' = 'en') {
  render(() => (
    <I18nProvider locale={locale}>
      <MemoryRouter>
        <Route path="*" component={Page} />
      </MemoryRouter>
    </I18nProvider>
  ))
  await loadGroups(['legal'])
}

describe('LegalDocument (ADR 0074)', () => {
  it('draws the terms in the entry frame: the title, the version in force, and each paragraph', async () => {
    await renderPage(TermsPage)

    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument()
    const day = formatDate(new Date(`${legal.version}T00:00:00Z`), 'en', 'UTC')
    expect(screen.getByText(`Version of ${day}`)).toBeInTheDocument()
    expect(screen.getByText(/This text is a placeholder/)).toBeInTheDocument()
    expect(document.querySelectorAll('main p').length).toBeGreaterThan(3)
  })

  it('draws the privacy notice in the reader’s language', async () => {
    await renderPage(PrivacyPage, 'pt-BR')

    expect(await screen.findByRole('heading', { level: 1, name: 'Aviso de privacidade' })).toBeInTheDocument()
    expect(screen.getByText(/Este texto é provisório/)).toBeInTheDocument()
  })
})
