import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { NotFoundPage } from './not-found-page'

describe('NotFoundPage', () => {
  it('says the page is not there, with the way back to the start', () => {
    render(() => (
      <I18nProvider locale="en">
        <MemoryRouter>
          <Route path="*" component={NotFoundPage} />
        </MemoryRouter>
      </I18nProvider>
    ))

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toHaveFocus()
    expect(screen.getByText('The address may be wrong, or the page may have moved.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', '/')
  })
})
