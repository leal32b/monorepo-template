import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import type { JSX } from 'solid-js'
import { I18nProvider } from '#shared/config'
import { EntryLayout } from './entry-layout'

/** True when `later` comes after `earlier` in the document, as it is read and laid out. */
const follows = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)

/** An entry screen in a router, as the app renders it. */
function renderScreen(screenInRouter: () => JSX.Element) {
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter>
        <Route path="*" component={screenInRouter} />
      </MemoryRouter>
    </I18nProvider>
  ))
}

const renderSignIn = () =>
  renderScreen(() => (
    <EntryLayout title="Sign in" description="Welcome back." footer={<a href="/signup">Create an account</a>}>
      <form aria-label="Sign-in form" />
    </EntryLayout>
  ))

describe('EntryLayout', () => {
  it('frames an entry screen: brand, heading, description, content and footer, in that order', () => {
    renderSignIn()
    const brand = screen.getByRole('link', { name: 'Monorepo Template' })
    const heading = screen.getByRole('heading', { level: 1, name: 'Sign in' })
    const form = screen.getByRole('form', { name: 'Sign-in form' })
    const footer = screen.getByRole('link', { name: 'Create an account' })

    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
    expect([follows(brand, heading), follows(heading, form), follows(form, footer)]).toEqual([true, true, true])
  })

  it('leaves out the description and the footer when a screen has none', () => {
    renderScreen(() => (
      <EntryLayout title="Two-step verification">
        <form aria-label="Code form" />
      </EntryLayout>
    ))

    // The brand, the heading and the form: nothing empty takes room between them.
    expect(screen.getByRole('main').children).toHaveLength(3)
  })

  it('links the brand to the home page', () => {
    renderSignIn()

    expect(screen.getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/')
  })

  it('moves focus to the heading when the screen opens, as after a route change', () => {
    renderSignIn()

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('keeps every entry screen in the same narrow column, top-aligned, mobile first', () => {
    renderSignIn()

    expect(screen.getByRole('main')).toHaveClass('max-w-sm', 'px-4', 'py-8', 'sm:px-6', 'sm:py-12')
  })
})
